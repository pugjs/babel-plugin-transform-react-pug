// @flow

import error from 'pug-error';
import t from './lib/babel-types';

/*
 * We need to auto-generate keys whenever react-pug uses an array as the underlying
 * representation for a static list of elements.
 */

import addString from './utils/add-string';

type OnKeyCallback = (id: Expression) => mixed;

declare interface Key {
  getKey(fn: OnKeyCallback): void;
  handleAttributes(attrs: Array<JSXAttribute | JSXSpreadAttribute>): void;
  end(): void;
}
export type {Key};

function toJsxValue(e: Expression): StringLiteral | JSXExpressionContainer {
  return t.asStringLiteral(e) || t.jSXExpressionContainer(e);
}

export class BaseKey implements Key {
  getKey(fn: OnKeyCallback) {
    fn(t.stringLiteral('pug'));
  }
  handleAttributes(attrs: Array<JSXAttribute | JSXSpreadAttribute>) {}
  end() {}
}

/*
 * Static blocks are used for things like if statements, that may become arrays
 * behind the sceens, but that do not actually involve iteration, and therefore
 * do not require the user to manually supply a key.
 */
export class StaticBlock implements Key {
  _ended: boolean = false;
  _parentEnded: boolean = false;
  _key: ?Expression = null;
  _pending: Array<OnKeyCallback> = [];
  _index: number = 0;
  constructor(parent: Key, staticBlockID: string | number) {
    parent.getKey(parentKey => {
      this._parentEnded = true;
      this._key = addString(parentKey, t.stringLiteral(':' + staticBlockID));
      this._update();
    });
  }
  _update() {
    if (this._ended && this._parentEnded) {
      const key = this._key;
      if (!key) {
        throw new Error('Expected key to be an expression');
      }
      while (this._pending.length) {
        this._pending.shift()(key);
      }
    }
  }
  getKey(fn: OnKeyCallback) {
    if (this._pending.indexOf(fn) === -1) {
      const index = this._index++;
      this._pending.push(key =>
        fn(addString(key, t.stringLiteral(':' + index))),
      );
    }
    this._update();
  }
  handleAttributes(attrs: Array<JSXAttribute | JSXSpreadAttribute>) {
    for (const _attr of attrs) {
      const attr = t.asJSXAttribute(_attr);
      if (attr && t.isJSXIdentifier(attr.name, {name: 'key'})) {
        return;
      }
    }
    this.getKey(key => {
      attrs.push(t.jSXAttribute(t.jSXIdentifier('key'), toJsxValue(key)));
    });
  }
  end() {
    this._ended = true;
    this._update();
  }
}

/*
 * Dynamic blocks are used for real iteration, we require the user to add a key to
 * at least one elemnt within the array, and then we build keys for all the other
 * elements from that one intial key.
 */
export class DynamicBlock implements Key {
  _ended = false;
  _localKey = null;
  _parentEnded = false;
  _parentKey = null;
  _pending = [];
  _index = 0;
  _srcForError: string;
  _lineNumberForError: number;

  constructor(parent: Key, srcForError: string, lineNumberForError: number) {
    this._srcForError = srcForError;
    this._lineNumberForError = lineNumberForError;
    parent.getKey(parentKey => {
      this._parentEnded = true;
      this._parentKey = parentKey;
      this._update();
    });
  }
  _update() {
    const parentKey = this._parentKey;
    const localKey = this._localKey;
    if (this._ended && this._parentEnded && localKey) {
      if (!parentKey) {
        throw new Error(
          'There should always be a parent key once it has ended',
        );
      }
      const key = t.binaryExpression('+', parentKey, localKey);
      while (this._pending.length) {
        this._pending.shift()(key);
      }
    } else if (this._ended && this._parentEnded && this._pending.length) {
      const err = error(
        'MISSING_KEY',
        'You must specify a key for the first item in any loops.',
        {
          line: this._lineNumberForError,
          filename: 'pug',
          src: this._srcForError,
        },
      );
      throw err;
    }
  }

  getKey(fn: OnKeyCallback) {
    if (this._pending.indexOf(fn) === -1) {
      const index = this._index++;
      this._pending.push((key: Expression) => {
        return fn(addString(key, t.stringLiteral(':' + index)));
      });
    }
    this._update();
  }

  handleAttributes(attrs: Array<JSXAttribute | JSXSpreadAttribute>) {
    for (const _attr of attrs) {
      const attr = t.asJSXAttribute(_attr);
      if (attr && t.isJSXIdentifier(attr.name, {name: 'key'})) {
        if (this._localKey) {
          return;
        }
        const value = t.asJSXExpressionContainer(attr.value);
        if (value && value.expression) {
          this._localKey = value.expression;
          this._update();
          // remove the attribute and replace with the properly nested version
          attrs.splice(attrs.indexOf(attr), 1);
        } else {
          return;
        }
      }
    }
    this.getKey(key => {
      attrs.push(t.jSXAttribute(t.jSXIdentifier('key'), toJsxValue(key)));
    });
  }

  end() {
    this._ended = true;
    this._update();
  }
}
