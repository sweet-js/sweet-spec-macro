#lang 'sweet.js';

export syntax spec = ctx => {
  let name = ctx.next();
  let bodyOrExtends = ctx.next();
  let here = #`here`.get(0);

  function findFields (delim) {
    let attributes = [];
    let innerCtx = delim.inner();

    for (let stx of innerCtx) {
      if (stx.isIdentifier() || stx.isKeyword()) {
        innerCtx.next(); // :
        let type = innerCtx.next().value;
        if (type == null) { throw new Error(`what: ${stx.val()}`) }
        attributes.push({
          attrName: stx.val(),
          attrType: {
            name: type.val()
          }
        });
      }
    }
    return attributes;
  }

  function getHasAttrTemplate(attrs, attributes) {
    let hasAttrsTemplate = attributes.map(function (attr) {
      let attrStx = here.fromString(attr.attrName);
      return #`
        if(!{}.hasOwnProperty.call(${attrs}, ${attrStx})) {
          throw new Error('Missing attribute: ' + ${attrStx});
        }`;
    });
    let temp = #``;
    for (let check of hasAttrsTemplate) {
      temp = temp.concat(check);
    }
    return temp;
  }

  let reduceNameStx = here.fromIdentifier(`reduce${name.value.val()}`);
  if ((!bodyOrExtends.done) && bodyOrExtends.value.isBraces()) {
    let attributes = findFields(bodyOrExtends.value);
    return #`
      const ${name.value} = class {
        constructor(attrs) {
          ${getHasAttrTemplate(#`attrs`, attributes)}
          Object.assign(this, attrs);
        }
      }
      ${name.value}.CloneReducer = class {
        ${reduceNameStx}(term, state) {
          return term;
        }
      }
    `;
  } else {
    let base = ctx.next();
    let body = ctx.next();
    let attributes = findFields(body.value);
    return #`
      const ${name.value} = class extends ${base.value} {
        constructor(attrs) {
          super(attrs);
          ${getHasAttrTemplate(#`attrs`, attributes)}
        }
      }
      ${base.value}.${name.value} = ${name.value};
      ${base.value}.CloneReducer.${reduceNameStx} = function (term, state) { return term; };
    `;
  }
};
