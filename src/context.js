// @flow

import {readFileSync, existsSync} from 'fs';
import error from 'pug-error';
import type {Key} from './block-key';
import {getCurrentLocation} from './lib/babel-types';
import {BaseKey, StaticBlock, DynamicBlock} from './block-key';

export type VariableKind = 'var' | 'let' | 'const';

type Variable = {
  kind: VariableKind,
  id: Identifier,
};

type Options = {
  classAttribute: string,
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
  _options: Options;

  constructor(params: {
    definesScope: boolean,
    key: Key,
    parent: ?Context,
    file: Object,
    path: Object,
    options: Options,
    interpolations?: Map<string, Expression>,
  }) {
    if (!params.definesScope && params.parent) {
      this.variablesToDeclare = params.parent.variablesToDeclare;
    }

    this._parent = params.parent;
    this.key = params.key;
    this.file = params.file;
    this.path = params.path;
    this._interpolations = params.interpolations;
    this._options = params.options;
  }

  error(code: string, message: string): Error {
    const options: Object = {
      filename: this.file.opts.filename,
      line: getCurrentLocation().start.line - 1,
      src: null,
    };

    if (existsSync(options.filename)) {
      options.src = readFileSync(this.file.opts.filename, 'utf8');
    }

    return error(code, message, options);
  }

  noKey<T>(fn: (context: Context) => T): T {
    const childContext = new Context({
      definesScope: false,
      key: new BaseKey(),
      parent: this,
      file: this.file,
      path: this.path,
      options: this._options,
    });

    const result = fn(childContext);
    childContext.end();

    return result;
  }

  staticBlock<T>(fn: (context: Context) => T): T {
    const childContext = new Context({
      definesScope: false,
      key: new StaticBlock(this.key, this._nextBlockID++),
      parent: this,
      file: this.file,
      path: this.path,
      options: this._options,
    });

    const result = fn(childContext);
    childContext.end();

    return result;
  }

  dynamicBlock<T>(
    fn: (context: Context) => T,
  ): {result: T, variables: Array<Identifier>} {
    const childContext = new Context({
      definesScope: true,
      key: new DynamicBlock(this.key, 'src', 0),
      parent: this,
      file: this.file,
      path: this.path,
      options: this._options,
    });

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
   * @returns { ?Expression } The interpolation or nothing.
   */
  getInterpolationByRef(reference: string): ?Expression {
    let interpolation = null;

    if (
      this._interpolations &&
      (interpolation = this._interpolations.get(reference))
    ) {
      return interpolation;
    } else if (this._parent) {
      return this._parent.getInterpolationByRef(reference);
    }

    return this.getInterpolationByRef(reference);
  }

  static create(
    file: Object,
    path: Object,
    interpolations?: Map<string, Expression>,
    params: {options: Options},
  ) {
    return new Context({
      definesScope: true,
      key: new BaseKey(),
      parent: null,
      file,
      path,
      options: params.options,
      interpolations,
    });
  }
}

export default Context;
