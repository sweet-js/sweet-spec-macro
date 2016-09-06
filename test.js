import { spec } from './src/spec.js';

spec A {
  a: base;
}

spec B : A {
  b: A;
  c: A[];
  d: base[];
}
