import test from 'ava';
import { compile } from 'sweet.js';

function compileAndEval(code) {
  let output;
  let res = compile(code).code;
  eval(res);
  return output;
}

test('can check for attribute existence on a single spec', t => {
  let output = compileAndEval(`
    #lang 'sweet.js';
    import { spec } from '../src/spec.js';

    spec A {
      a : any
    }
    output = {
      a: A.hasAttribute('a'),
      b: A.hasAttribute('b')
    };
  `);

  t.true(output.a);
  t.false(output.b);
});

test('can check for attribute existence on a child spec', t => {
  let output = compileAndEval(`
    #lang 'sweet.js';
    import { spec } from '../src/spec.js';

    spec A {
      a : any;
    }
    spec B : A {
      b : any;
    }
    output = {
      a: B.hasAttribute('a'),
      b: B.hasAttribute('b')
    };
  `);

  t.true(output.a);
  t.true(output.b);
});

test('can get attributes', t => {
  let output = compileAndEval(`
    #lang 'sweet.js';
    import { spec } from '../src/spec.js';

    spec A {
      a : any;
    }
    spec B : A {
      b : any;
    }
    output = {
      a: A.getAttributes(),
      b: B.getAttributes()
    };
  `);

  t.deepEqual(output.a, [{ attrName: 'a', attrType: { name: 'any' }}]);
  t.deepEqual(output.b, [{ attrName: 'a', attrType: { name: 'any' }},
                         { attrName: 'b', attrType: { name: 'any' }}]);
});

test('can get descendant', t => {
  let output = compileAndEval(`
    #lang 'sweet.js';
    import { spec } from '../src/spec.js';

    spec A {
      a : any;
    }
    spec B : A {
      b : any;
    }
    output = {
      hasB: A.hasDescendant('B'),
      hasBAttr: B.getDescendant('B').hasAttribute('b')
    };
  `);
  t.is(output.hasB, true);
  t.is(output.hasBAttr, true);
});
