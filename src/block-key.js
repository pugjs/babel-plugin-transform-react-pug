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
  handleAttributes(attrs: Array<JSXAttribute | JSXSpreadAttribute>) {}
  end() {
    this._ended = true;
    this._update();
  }
}

/*
 * Dynamic blocks are used for real iteration, we require the user to add a key to
 * at least one element within the array, and then we build keys for all the other
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
  _update() {}

  getKey(fn: OnKeyCallback) {
    if (this._pending.indexOf(fn) === -1) {
      const index = this._index++;
      this._pending.push((key: Expression) => {
        return fn(key);
      });
    }
    this._update();
  }

  handleAttributes() {}

  end() {
    this._ended = true;
    this._update();
  }
}
