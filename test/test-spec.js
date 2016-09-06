import test from 'ava';
import { compile } from 'sweet.js';

function compileAndEval(code) {
  let output;
  let res = compile(code).code;
  eval(res);
  return output;
}

test('can construct terms', t => {
  let output = compileAndEval(`
    #lang 'sweet.js';
    import { spec } from '../src/spec.js';

    spec A {
      a: base;
    }
    spec B : A {
      b: base;
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
    import { spec } from '../src/spec.js';

    spec A {
      a: base;
    }
    new A({ b: 'b' });
  `), /missing attribute/i);

  t.throws(() => compileAndEval(`
    #lang 'sweet.js';
    import { spec } from '../src/spec.js';

    spec A {
      a: base;
    }
    spec B : A {
      b: base;
    }
    new B({ a: 'a', c: 'c' });
  `), /missing attribute/i);
});

test('can clone reduce', t => {
  let output = compileAndEval(`
    #lang 'sweet.js';
    import { spec } from '../src/spec.js';

    spec A {
      a: base;
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
