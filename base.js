'use strict';

var aFrom          = require('es5-ext/array/from')
  , assign         = require('es5-ext/object/assign')
  , forEach        = require('es5-ext/object/for-each')
  , d              = require('d')
  , autoBind       = require('d/auto-bind')
  , lazy           = require('d/lazy')
  , memoizeMethods = require('memoizee/methods-plain')
  , validDocument  = require('dom-ext/document/valid-document')
  , normalize      = require('dom-ext/document/#/normalize')
  , isDF           = require('dom-ext/document-fragment/is-document-fragment')
  , isNode         = require('dom-ext/node/is-node')
  , validNode      = require('dom-ext/node/valid-node')
  , ext            = require('./ext')
  , construct      = require('./_construct-element')

  , slice = Array.prototype.slice
  , create = Object.create, defineProperty = Object.defineProperty
  , defineProperties = Object.defineProperties
  , getPrototypeOf = Object.getPrototypeOf, Base;

module.exports = Base = function (document) {
	if (!(this instanceof Base)) return new Base(document);
	this.document = validDocument(document);
	defineProperties(this, {
		_current: d(document.createDocumentFragment()),
		_directives: d(create(null, {
			_element: d(create(null))
		})),
		ns: d(create(this.ns, { _domjs: d(this) }))
	});
};
Object.defineProperties(Base.prototype, assign({
	collect: d(function (fn) {
		var previous = this._current
		  , current = (this._current = this.document.createDocumentFragment());
		fn();
		this._current = previous;
		return current;
	}),
	safeCollect: d(function (fn) {
		var direct, result, l;
		result = this.collect(function () { direct = fn(); });
		if (direct) result = direct;
		if (result == null) return null;
		if (!isNode(result)) return normalize.call(this.document, result);
		if (!isDF(result)) return result;
		l = result.childNodes.length;
		if (!l) return null;
		if (l === 1) return result.childNodes[0];
		return aFrom(result.childNodes);
	})
}, lazy({
	_commentProto: d(function self() {
		var proto = create(getPrototypeOf(this.document.createComment('')), {
			domjs: d(this)
		});
		forEach(ext._comment, function (value, name) {
			defineProperty(proto, name, d(value));
		});
		return proto;
	}),
	_textProto: d(function () {
		var proto = create(getPrototypeOf(this.document.createTextNode('')), {
			domjs: d(this)
		});
		forEach(ext._text, function (value, name) {
			defineProperty(proto, name, d(value));
		});
		return proto;
	})
}), memoizeMethods({
	_elementProto: d(function (name) {
		var proto = create(getPrototypeOf(this.document.createElement(name)));
		forEach(ext._element, function (value, name) {
			defineProperty(proto, name, d(value));
		});
		if (ext[name]) {
			forEach(ext[name], function (value, name) {
				defineProperty(proto, name, d(value));
			});
		}
		defineProperties(proto, {
			domjs: d(this),
			_directives: d(this.getDirectives(name))
		});
		return proto;
	}),
	getDirectives: d(function (name) {
		return (this._directives[name] = create(this._directives._element));
	})
}), {
	ns: d(create(null, autoBind({
		comment: d('cew', function (data) {
			var el = this._current.appendChild(this.document.createComment(data));
			el.__proto__ = this._commentProto;
			if (el._construct) el._construct.apply(el, slice.call(arguments, 1));
			return el;
		}),
		text: d('cew', function (data/* …data*/) {
			var el = this._current.appendChild(this.document.createTextNode(data));
			el.__proto__ = this._textProto;
			if (el._construct) el._construct.apply(el, slice.call(arguments, 1));
			return el;
		}),
		element: d('cew', function (name/*[, attributes], …content*/) {
			var el = this._current.appendChild(this.document.createElement(name));
			el.__proto__ = this._elementProto(name);
			construct(el, slice.call(arguments, 1));
			return el;
		}),
		normalize: d('cew', function (node) {
			var name = validNode(node).nodeName.toLowerCase();
			if (name === '#text') node.__proto__ = this._textProto;
			else if (name === '#comment') node.__proto__ = this._commentProto;
			else if (name[0] !== '#') node.__proto__ = this._elementProto(name);
			else throw new TypeError("Unsupported node type");
			return node;
		}),
		insert: d('cew', function (node/*, …nodes*/) {
			var dom = normalize.apply(this.document, arguments), result;
			if (isDF(dom)) result = aFrom(dom.childNodes);
			else result = dom;
			this._current.appendChild(dom);
			return result;
		})
	}, '_domjs')))
}));
