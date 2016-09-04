#lang 'sweet.js';

/**
type AttrType = {
  name: string;
}
type AttrInfo = {
  attrName: string;
  attrType: AttrType;
}
type Spec = {
  getName(): string;

  getChildren(): Array<Spec>;
  getParent(): Spec;

  hasAncestor(ancestor: Spec): boolean;

  hasDescendant(name: string): boolean
  getDescendant(name: string): ?Spec

  hasAttribute(name: string): boolean;
  getAttribute(name: string): Array<AttrInfo>;
}
**/

export syntax spec = ctx => {
  let name = ctx.next();
  let bodyOrExtends = ctx.next();
  let here = #`here`.get(0);

  function findFields (delim) {
    let attributes = #``;
    let innerCtx = delim.inner();

    for (let stx of innerCtx) {
      if (stx.isIdentifier() || stx.isKeyword()) {
        innerCtx.next(); // :
        let type = innerCtx.next().value;
        if (type == null) { throw new Error(`what: ${stx.val()}`) }
        attributes = attributes.concat(#`{
          attrName: ${here.fromString(stx.val())},
          attrType: {
            name: ${here.fromString(type.val())}
          }
        }`)
      }
    }
    return #`[${attributes}]`;
  }

  if ((!bodyOrExtends.done) && bodyOrExtends.value.isBraces()) {
    let attributes = findFields(bodyOrExtends.value);
    return #`
      const ${name.value} = Object.create(Object.prototype, {
        _attributes: {
          value: ${attributes},
          writable: false, configurable: false, enumerable: false
        },
        _children: {
          value: [],
          writable: false, configurable: false, enumerable: false
        },
        _descendants: {
          value: new Map(),
          writable: false, configurable: false, enumerable: false
        },
        hasDescendant: {
          value: function(name) {
            return this._descendants.has(name);
          },
          writable: false, configurable: false, enumerable: true
        },
        getDescendant: {
          value: function(name) {
            return this._descendants.get(name);
          },
          writable: false, configurable: false, enumerable: true
        },
        getAttributes: {
          value: function() {
            return this._attributes;
          },
          writable: false, configurable: false, enumerable: true
        },
        hasAttribute: {
          value: function(attr) {
            return this._attributes.some(a => a.attrName === attr)
          },
          writable: false, configurable: false, enumerable: true
        }
      });
    `;
  } else {
    let base = ctx.next();
    let body = ctx.next();
    let attributes = findFields(body.value);
    return #`
      const ${name.value} = Object.create(${base.value}, {
        _attributes: {
          value: ${attributes},
          writable: false, configurable: false, enumerable: false
        },
        _children: {
          value: [],
          writable: false, configurable: false, enumerable: false
        },
        getAttributes: {
          value: function() {
            return (${base.value}.getAttributes()).concat(this._attributes);
          },
          writable: false, configurable: false, enumerable: true
        },
        hasAttribute: {
          value: function(attr) {
            return this.getAttributes().some(a => a.attrName === attr);
          },
          writable: false, configurable: false, enumerable: true
        }
      });
      ${base.value}._children.push(${name.value});
      ${base.value}._descendants.set(${here.fromString(name.value.val())}, ${name.value});
    `;
  }
};
