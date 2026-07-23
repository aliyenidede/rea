#!/usr/bin/env node
'use strict';

const { cli } = require('../src/cli.js');

process.exitCode = cli(process.argv.slice(2));
