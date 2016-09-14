#lang 'sweet.js';

export syntax declare = ctx => {
  ctx.next();
  let name = ctx.next();
  let bodyOrExtends = ctx.next();
  let here = #`here`.get(0);

  function findFields (delim) {
    let attributes = [];
    let innerCtx = delim.inner();

    for (let stx of innerCtx) {
      if (stx.isIdentifier() || stx.isKeyword()) {
        let attrName = stx.val();
        innerCtx.next(); // :
        let type = innerCtx.next().value;
        if (type == null) { throw new Error(`Bad syntax: ${stx.val()}`) }
        let attrTypeName = type.val();
        let typeArgStx = innerCtx.next().value;
        let arg = null;
        if (typeArgStx && typeArgStx.isBrackets()) {
          arg = attrTypeName;
          attrTypeName = 'List';
        }
        attributes.push({
          attrName: attrName,
          attrType: {
            name: attrTypeName,
            arg: arg
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

  function attrAction(reducerStx, attrStx, attr) {
    let attrNameStx = here.fromIdentifier(attr.attrName);
    let attrTypeStx = name.value.fromIdentifier(attr.attrType.name);
    let action;
    switch (attr.attrType.name) {
      case 'any':
        action = #`${attrStx}`;
        break;
      case 'List':
        let mappedAttr = {
          attrName: attr.attrName,
          attrType: {
            name: attr.attrType.arg,
          }
        };
        action = #`${attrStx}.map(a => ${attrAction(reducerStx, #`a`, mappedAttr)})`
        break;
      default:
        action = #`
          (${attrStx} instanceof ${attrTypeStx}) ?
          (${attrStx}.reduce(${reducerStx})) :
          function () { throw new Error('Unknown object: ' + JSON.stringify(${attrStx})) }.call(this)`;
    }
    return action;
  }

  function assignState(stateStx, reducerStx, attributes) {
    let subReduce = attributes.map(function (attr) {
      let attrNameStx = here.fromIdentifier(attr.attrName);
      let attrStx = #`this.${attrNameStx}`;
      return #`${stateStx}.${attrNameStx} = ${attrAction(reducerStx, attrStx, attr)};`
    });
    let result = #``;
    for (let red of subReduce) {
      result = result.concat(red);
    }
    return result;
  }

  let reduceNameStx = here.fromIdentifier(`reduce${name.value.val()}`);
  let nameStr = here.fromString(name.value.val());
  if ((!bodyOrExtends.done) && bodyOrExtends.value.isBraces()) {
    let attributes = findFields(bodyOrExtends.value);
    return #`
      const ${name.value} = class {
        constructor(attrs, type) {
          ${getHasAttrTemplate(#`attrs`, attributes)}
          Object.assign(this, attrs);
          this.type = type || ${nameStr};
          this.loc = null;
          Object.freeze(this);
        }
        _reduceState(reducer, state = {}) {
          ${assignState(#`state`, #`reducer`, attributes)}
          return state;
        }
        reduce(reducer) {
          let state = this._reduceState(reducer);
          return reducer.${reduceNameStx}(this, state);
        }
      }
      ${name.value}.CloneReducer = class {
        ${reduceNameStx}(term, state) {
          return new ${name.value}(state);
        }
      };
      export default ${name.value};
    `;
  } else {
    let base = ctx.next();
    let body = ctx.next();
    let attributes = findFields(body.value);
    return #`
      const ${name.value} = class extends ${base.value} {
        constructor(attrs, type) {
          super(attrs, type || ${nameStr});
          ${getHasAttrTemplate(#`attrs`, attributes)}
        }
        _reduceState(reducer, state = {}) {
          ${assignState(#`state`, #`reducer`, attributes)};
          return super._reduceState(reducer, state);
        }
        reduce(reducer) {
          let state = this._reduceState(reducer);
          return reducer.${reduceNameStx}(this, state);
        }
      }
      ${base.value}.CloneReducer.prototype.${reduceNameStx} = function (term, state) {
        return new ${name.value}(state);
      };
      export { ${name.value} };
    `;
  }
};
