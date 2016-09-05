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
      a: any;
    }
    spec B : A {
      b: any;
    }
    output = {
      a: new A({ a: 'a' }),
      b: new A.B({ a: 'a', b: 'b'})
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
      a: any;
    }
    new A({ b: 'b' });
  `));

  t.throws(() => compileAndEval(`
    #lang 'sweet.js';
    import { spec } from '../src/spec.js';

    spec A {
      a: any;
    }
    spec B : A {
      b: any;
    }
    new B({ a: 'a', c: 'c' });
  `));
});
