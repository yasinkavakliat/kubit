#!/usr/bin/env node
import 'reflect-metadata';

import sourcemaps from 'source-map-support';

import { Ignitor } from './Ignitor';

sourcemaps.install({ handleUncaughtExceptions: false });

new Ignitor(process.cwd()).ace().handle(process.argv.slice(2));