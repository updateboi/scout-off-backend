#!/usr/bin/env node
/**
 * CI guard: validates that the compiled OpenAPI spec satisfies the minimum
 * structural requirements of OpenAPI 3.0.x.
 *
 * Runs after `npm run build` so it operates against compiled JS in dist/.
 * Exits with code 1 on any violation so the CI job fails fast.
 */

'use strict';

const path = require('path');

let spec;
try {
  // Require the compiled output
  const mod = require(path.resolve(__dirname, '../dist/openapi/spec.js'));
  spec = mod.openApiSpec;
} catch (e) {
  console.error('ERROR: Could not load dist/openapi/spec.js — run `npm run build` first.');
  console.error(e.message);
  process.exit(1);
}

const errors = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

// Top-level required fields
check(spec && typeof spec === 'object', 'spec must be an object');
check(typeof spec.openapi === 'string' && spec.openapi.startsWith('3.0.'), `openapi field must be "3.0.x", got: ${spec.openapi}`);
check(spec.info && typeof spec.info.title === 'string', 'info.title must be a string');
check(spec.info && typeof spec.info.version === 'string', 'info.version must be a string');
check(Array.isArray(spec.servers) && spec.servers.length > 0, 'servers must be a non-empty array');
check(spec.paths && typeof spec.paths === 'object', 'paths must be an object');
check(Object.keys(spec.paths).length > 0, 'paths must contain at least one entry');

// Every path item must have at least one HTTP method with a responses object
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];
for (const [pathKey, pathItem] of Object.entries(spec.paths)) {
  const methods = HTTP_METHODS.filter((m) => pathItem[m]);
  check(methods.length > 0, `Path "${pathKey}" has no HTTP method defined`);
  for (const method of methods) {
    const op = pathItem[method];
    check(op.responses && typeof op.responses === 'object' && Object.keys(op.responses).length > 0,
      `${method.toUpperCase()} ${pathKey}: responses must be a non-empty object`);
  }
}

// Security schemes must exist if any operation uses security
check(
  spec.components && spec.components.securitySchemes && spec.components.securitySchemes.BearerAuth,
  'components.securitySchemes.BearerAuth must be defined'
);

if (errors.length > 0) {
  console.error(`OpenAPI spec validation FAILED with ${errors.length} error(s):`);
  errors.forEach((e, i) => console.error(`  ${i + 1}. ${e}`));
  process.exit(1);
}

console.log(`OpenAPI spec OK — ${Object.keys(spec.paths).length} paths validated (openapi: ${spec.openapi}, version: ${spec.info.version})`);
