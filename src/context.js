// @flow

import {readFileSync} from 'fs';
import error from 'pug-error';
import type {Key} from './block-key';
import Scope from './scope';
import t, {getCurrentLocation} from './babel-types';
import {BaseKey, StaticBlock, DynamicBlock} from './block-key';

export type VariableKind = 'var' | 'let' | 'const';

type Variable = {
  kind: VariableKind,
  id: Identifier,
};

class Context {
  key: Key;
  file: Object;
  path: Object;
  _variables: Map<string, Variable> = new Map();
  variablesToDeclare: Array<Identifier> = [];
  _nextBlockID: number = 0;
  _parent: ?Context;
  _interpolations: ?Map<string, Expression>;

  constructor(definesScope: boolean, key: Key, parent: ?Context, file: Object, path: Object, interpolations: ?Map<string, Expression>) {
    if (!definesScope && parent) {
      this.variablesToDeclare = parent.variablesToDeclare;
    }
    this._parent = parent;
    this.key = key;
    this.file = file;
    this.path = path;
    this._interpolations = interpolations;

  }

  error(code: string, message: string): Error {
    const src = readFileSync(this.file.opts.filename, 'utf8');
    return error(code, message, {
      filename: this.file.opts.filename,
      line: getCurrentLocation().start.line - 1,
      src,
    });
  }

  noKey<T>(fn: (context: Context) => T): T {
    const childContext = new Context(false, new BaseKey(), this, this.file, this.path);
    const result = fn(childContext);
    childContext.end();
    return result;
  }

  staticBlock<T>(fn: (context: Context) => T): T {
    const childContext = new Context(false, new StaticBlock(this.key, this._nextBlockID++), this, this.file, this.path);
    const result = fn(childContext);
    childContext.end();
    return result;
  }

  dynamicBlock<T>(fn: (context: Context) => T): {result: T, variables: Array<Identifier>} {
    const childContext = new Context(true, new DynamicBlock(this.key, 'src', 0), this, this.file, this.path);
    const result = fn(childContext);
    childContext.end();
    return {result, variables: childContext.variablesToDeclare};
  }

  end(): void {
    this.key.end();
  }

  getVariable(name: string): ?Variable {
    const variable = this._variables.get(name);

    if (variable) {
      return variable;
    }

    if (this._parent) {
      return this._parent.getVariable(name);
    }

    // TODO: maybe actually verify existance/non-const in parent scope?
    return null;
  }

  declareVariable(kind: 'var' | 'let' | 'const', name: string): Variable {
    if (typeof name !== 'string') {
      throw new Error('variables may only be declared with strings');
    }

    const oldVariable = this._variables.get(name);

    if (oldVariable) {
      if (oldVariable.kind !== 'var' || kind !== 'var') {
        const err = this.error(
          'DUPLICATE_VARIABLE',
          `Duplicate variable ${name}.`,
        );
        throw err;
      }
      // TODO: does this need to be updated(?)
      // this._variables.set(name, oldVariable)
      return oldVariable;
    }

    const variable = {
      kind,
      id: this.generateUidIdentifier(name),
    };

    this.variablesToDeclare.push(variable.id);
    this._variables.set(name, variable);
    return variable;
  }

  generateUidIdentifier(name: string): Identifier {
    return this.path.scope.generateUidIdentifier(name);
  }

  getBaseLine(): number {
    return this.path.node.loc.start.line;
  }

  /**
   * Check whether interpolations exist for the context, if not,
   * recursively check the parent context for the interpolation.
   * @param { String } reference - The interpolation reference
   * @returns { ?BabelNode } The interpolation or nothing.
   */
  getInterpolationByRef(reference: string): ?Expression {

    let interpolation = null;

    if (this._interpolations && (interpolation = this._interpolations.get(reference))) {
      return interpolation;
    } else if (this._parent) {
      return this.getInterpolationByRef.bind(this._parent)(reference);
    }

    return interpolation;

  }

  static create(file: Object, path: Object, interpolations?: Map<string, Expression>) {
    return new Context(
      true,
      new BaseKey(),
      null,
      file,
      path,
      interpolations
    );
  }
}

export default Context;
