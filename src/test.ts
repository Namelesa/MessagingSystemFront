import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

declare const require: {
  context(path: string, deep?: boolean, filter?: RegExp): {
    <T>(id: string): T;
    keys(): string[];
  };
};

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting()
);

const contextSrc = require.context('./', true, /\.spec\.ts$/);
contextSrc.keys().forEach(contextSrc);

const contextTest = require.context('../test/', true, /\.spec\.ts$/);
contextTest.keys().forEach(contextTest);