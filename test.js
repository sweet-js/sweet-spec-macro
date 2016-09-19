#lang 'sweet.js';
import { declare } from './src/spec.js';

declare class A {
  a: any;
}
declare class B extends A {
  b: any;
}
output = {
  a: new A({ a: 'a' }),
  b: new B({ a: 'a', b: 'b'})
};
