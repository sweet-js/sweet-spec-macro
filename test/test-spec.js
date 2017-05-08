import test from 'ava';
import { compile } from 'sweet.js';
import { transform } from 'babel-core';

function compileAndEval(code) {
  let output;
  let res = transform(compile(code).code, {"plugins": ["transform-es2015-modules-commonjs"]}).code;
  // console.log(res);
  eval(res);
  return output;
}

test('can construct terms', t => {
  let output = compileAndEval(`
    #lang 'sweet.js';
    import { declare } from '../src/spec.js';

    declare export default class A {
      a: any;
    }
    declare export class B extends A {
      b: any;
    }
    output = {
      a: new A({ a: 'a' }),
      b: new B({ a: 'a', b: 'b'})
    };
  `);

  t.is(output.a.a, 'a');
  t.is(output.a.b, void 0);
  t.is(output.b.a, 'a');
  t.is(output.b.b, 'b');
});

test('cannot construct terms missing attributes', t => {
  t.throws(() => compileAndEval(`
    #lang 'sweet.js';
    import { declare } from '../src/spec.js';

    declare export default class A {
      a: any;
    }
    new A({ b: 'b' });
  `), /missing attribute/i);

  t.throws(() => compileAndEval(`
    #lang 'sweet.js';
    import { declare } from '../src/spec.js';

    declare export default class A {
      a: base;
    }
    declare export class B extends A {
      b: any;
    }
    new B({ a: 'a', c: 'c' });
  `), /missing attribute/i);
});

test('can clone reduce', t => {
  let output = compileAndEval(`
    #lang 'sweet.js';
    import { declare } from '../src/spec.js';

    declare export default class A {
      a: any;
    }
    let a = new A({ a: 'a'});
    output = a.reduce({
      reduceA (node, state) {
        return new A({ a: state.a + 'a' });
      }
    });
  `);
  t.is(output.a, 'aa');
});

test('a field can be another type', t => {
  let output = compileAndEval(`
    #lang 'sweet.js';
    import { declare } from '../src/spec.js';

    declare export default class A {
      a: any;
    }
    declare export class B extends A {
      b: A;
    }
    let a = new A({ a: 'a'});
    let b = new B({ a: 'a', b: a });
    output = b.reduce({
      reduceA (node, state) {
        return new A({ a: state.a + 'a' });
      }

      reduceB (node, state) {
        return new B({ a: state.a, b: state.b.a + 'b' });
      }
    });
  `);
  t.is(output.b, 'aab');
});

test('a field can be an array', t => {
  let output = compileAndEval(`
    #lang 'sweet.js';
    import { declare } from '../src/spec.js';

    declare export default class A {
      a: any[];
    }
    declare export class B extends A {
      b: A[];
    }
    let a = new A({ a: [1, 2, 3] });
    let b = new B({ a: [1, 2, 3], b: [a] });
    output = b.reduce({

      reduceA(node, state) {
        return new A({ a: state.a.map(el => el + 'a') });
      }

      reduceB(node, state) {
        return new B({ a: state.a, b: state.b })
      }

    });
  `);
  t.deepEqual(output.a, [1, 2, 3]);
  t.deepEqual(output.b[0].a, ['1a', '2a', '3a']);
});

test('a field can be a union', t => {
  let output = compileAndEval(`
    #lang 'sweet.js';
    import { declare } from '../src/spec.js';

    declare export default class Term {}
    declare export class Left extends Term {
      l: any;
    }
    declare export class Right extends Term {
      r: any;
    }

    declare export class Either extends Term {
      e: Left | Right;
    }
    let l = new Left({ l : 'left' });
    let r = new Right({ r : 'right' });
    let e = new Either({ e: l });

    output = e.reduce({
      reduceLeft(node, state) {
        return new Left({ l: 'l' });
      }
      reduceRight(node, state) {
        return new Right({ r: 'r' });
      }
      reduceEither(node, state) {
        return new Either({ e: state.e });
      }
    });
  `);
  t.is(output.e.l, 'l');
});

test('a field can be a list of unions', t => {
  let output = compileAndEval(`
    #lang 'sweet.js';
    import { declare } from '../src/spec.js';

    declare export default class Term {}
    declare export class Left extends Term {
      l: any;
    }
    declare export class Right extends Term {
      r: any;
    }

    declare export class Either extends Term {
      e: (Left | Right)[];
    }
    let l = new Left({ l : 'left' });
    let r1 = new Right({ r : 'right1' });
    let r2 = new Right({ r : 'right2' });
    let e = new Either({ e: [r1, r2] });

    output = e.reduce({
      reduceLeft(node, state) {
        return new Left({ l: 'l' });
      }
      reduceRight(node, state) {
        return new Right({ r: 'r' });
      }
      reduceEither(node, state) {
        return new Either({ e: state.e });
      }
    });
  `);
  t.is(output.e[0].r, 'r');
  t.is(output.e[1].r, 'r');
});

test('supports maybe types', t => {
  let output = compileAndEval(`
    #lang 'sweet.js';
    import { declare } from '../src/spec.js';

    declare export class Base {}

    declare export class A extends Base {
      a: any;
    }
    declare export class B extends Base {
      b?: A
    }
    let b = new B({b: null});
    output = b.reduce({
      reduceA(node, state) {
        return new A({ a: state.a });
      }
      reduceB(node, state) {
        return new B({ b: state.b });
      }
    })
  `);
  t.is(output.b, null);
});
