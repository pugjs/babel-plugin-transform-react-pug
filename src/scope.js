// // @flow
//
// import type Context from './context';
//
// class Scope {
//   _map: Map<string, Variable> = new Map();
//   _variables: Array<Variable> = [];
//   _parent = null;
//   _context: Context;
//   constructor(parent: ?Scope, context: Context) {
//     this._parent = parent || null;
//     this._context = context;
//   }
//   get(id: Identifier): Variable {
//     const variable = this._map.get(id.name);
//     if (variable) {
//       return variable;
//     }
//     if (this._parent) {
//       return this._parent.get(id);
//     }
//     // TODO: maybe actually verify existance/non-const in parent scope?
//     return {kind: 'var', id};
//   }
//   declare(kind: 'var' | 'let' | 'const', name: string): Variable {
//     if (typeof name !== 'string') {
//       throw new Error('variables may only be declared with strings');
//     }
//     const oldVariable = this._map.get(name);
//     if (oldVariable) {
//       if (oldVariable.kind !== 'var' || kind !== 'var') {
//         const err = this._context.error(
//           'DUPLICATE_VARIABLE',
//           `Duplicate variable ${name}.`,
//         );
//         throw err;
//       }
//       return oldVariable;
//     }
//     const variable = {
//       kind,
//       id: this._context.generateUidIdentifier(name),
//     };
//     this._variables.push(variable);
//     this._map.set(name, variable);
//     return variable;
//   }
//   getChildScope(context?: Context): Scope {
//     return new Scope(this, context || this._context);
//   }
// }
//
// export default Scope;
