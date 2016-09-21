#lang 'sweet.js';

export syntax declare = ctx => {
  ctx.next();
  let name = ctx.next();
  let bodyOrExtends = ctx.next();
  let here = #`here`.get(0);

  function getBaseType(ctx) {
    let next = ctx.next().value;
    let arg = null;
    let typeName;
    if (next.isParens()) {
      arg = getAttrType(next.inner());
    } else {
      typeName = next.val();
      arg = {
        typeName: next.val()
      };
    }

    let marker = ctx.mark();
    let typeArgStx = ctx.next();
    if (!typeArgStx.done && typeArgStx.value.isBrackets()) {
      return {
        typeName: 'List', arg
      };
    } else {
      ctx.reset(marker);
    }
    return {
      typeName: typeName,
      arg: arg
    };
  }

  function getAttrType(ctx) {
    let attrType = getBaseType(ctx);
    let next = ctx.next();
    if (!next.done && next.value.isPunctuator('|')) {
      attrType = {
        typeName: 'Union',
        arg: [attrType]
      }
      do {
        let nextType = getBaseType(ctx);
        attrType.arg.push(nextType);
        next = ctx.next();
      } while (!next.done && next.value.isPunctuator('|'));
    } else if (!next.done && !next.value.isPunctuator(';')) {
      throw new Error(`Unexpected token ${next.value.val()}`);
    }
    return attrType;
  }

  function findFields (delim) {
    let attributes = [];
    let innerCtx = delim.inner();

    for (let stx of innerCtx) {
      if (stx.isIdentifier() || stx.isKeyword()) {
        let attrName = stx.val();
        let colonOrMaybe = innerCtx.next();
        let isMaybe = false;
        if (colonOrMaybe.value.isPunctuator('?')) {
          colonOrMaybe = innerCtx.next();
          isMaybe = true;
        }
        if (!colonOrMaybe.value.isPunctuator(':')) {
          throw new Error('Unexpected syntax: ' + colonOrMaybe.value.val());
        }

        let attrType = isMaybe ? { typeName: 'Maybe', arg: getAttrType(innerCtx) } : getAttrType(innerCtx);
        attributes.push({
          attrName,
          attrType: attrType
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

  /*
  type BaseType = {
    typeName: 'any';
  } | {
    typeName: 'List';
    arg: AttrType;
  } | {
    typeName: string;
  }
  type CompoundType = {
    typeName: 'Union';
    arg: BaseType[]
  }

  type AttrType = BaseType | CompoundType

  */

  function attrAction(reducerStx, attrStx, attr) {
    let attrNameStx = here.fromIdentifier(attr.attrName);
    let attrTypeStx = name.value.fromIdentifier(attr.attrType.typeName);
    let action;
    switch (attr.attrType.typeName) {
      case 'any':
        action = #`${attrStx}`;
        break;
      case 'List':
        let mappedAttr = {
          attrName: attr.attrName,
          attrType: attr.attrType.arg,
        };
        action = #`${attrStx}.map(a => ${attrAction(reducerStx, #`a`, mappedAttr)})`
        break;
      case 'Union':
        action = attr.attrType.arg.reduce((acc, attrType) => {
          return acc.concat(#`
            (${attrStx} instanceof ${name.value.fromIdentifier(attrType.typeName)}) ?
            (${attrStx}.reduce(${reducerStx})) :`);
        }, #``).concat(#`function () { throw new Error('Unknown object: ' + JSON.stringify(${attrStx}))}.call(this)`);
        break;
      case 'Maybe':
        let maybeAttr = {
          attrName: attr.attrName,
          attrType: attr.attrType.arg
        };
        action = #`${attrStx} == null ? null : ${attrAction(reducerStx, attrStx, maybeAttr)}`;
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

  function getCloneAttrs(attributes) {
    return attributes.reduce((acc, attr) => {
      let attrStx = here.fromIdentifier(attr.attrName);
      return acc.concat(#`${attrStx} : this.${attrStx},`);
    }, #``);
  }

  let reduceNameStx = here.fromIdentifier(`reduce${name.value.val()}`);
  let nameStr = here.fromString(name.value.val());
  if ((!bodyOrExtends.done) && bodyOrExtends.value.isBraces()) {
    let attributes = findFields(bodyOrExtends.value);
    return #`
      class ${name.value} {
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
        _cloneAttrs() {
          return {
            ${getCloneAttrs(attributes)}
          };
        }
        reduce(reducer) {
          let state = this._reduceState(reducer);
          return reducer.${reduceNameStx}(this, state);
        }
        extend(attrs) {
          return new ${name.value}(Object.assign(this._cloneAttrs(), attrs));
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
      class ${name.value} extends ${base.value} {
        constructor(attrs, type) {
          super(attrs, type || ${nameStr});
          ${getHasAttrTemplate(#`attrs`, attributes)}
        }
        _reduceState(reducer, state = {}) {
          ${assignState(#`state`, #`reducer`, attributes)};
          return super._reduceState(reducer, state);
        }
        _cloneAttrs() {
          return Object.assign({
            ${getCloneAttrs(attributes)}
          }, super._cloneAttrs());
        }
        reduce(reducer) {
          let state = this._reduceState(reducer);
          return reducer.${reduceNameStx}(this, state);
        }
        extend(attrs) {
          return new ${name.value}(Object.assign(this._cloneAttrs(), attrs));
        }
      }
      ${base.value}.CloneReducer.prototype.${reduceNameStx} = function (term, state) {
        return new ${name.value}(state);
      };
      export { ${name.value} };
    `;
  }
};
