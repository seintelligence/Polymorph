/*jslint browser: true, devel: true, node: true, ass: true, nomen: true, unparam: true, indent: 4 */

/**
 * @license
 * Copyright (c) 2015 The ExpandJS authors. All rights reserved.
 * This code may only be used under the BSD style license found at https://expandjs.github.io/LICENSE.txt
 * The complete set of authors may be found at https://expandjs.github.io/AUTHORS.txt
 * The complete set of contributors may be found at https://expandjs.github.io/CONTRIBUTORS.txt
 */
(function () {
    "use strict";

    var _          = require('lodash'),
        isArray    = require('../tester/isArray'),
        isVoid     = require('../tester/isVoid'),
        isFunction = require('../tester/isFunction'),
        xnor       = require('../operator/xnor');

    /**
     * Checks if `value` instance of `Object`.
     *
     * ```js
     * XP.isObject({});
     * // => true
     *
     * XP.isObject(Error);
     * // => false
     *
     * XP.isObject([1, 2, 3]);
     * // => false
     *
     * XP.isObject(1);
     * // => false
     * ```
     *
     * @function isObject
     * @param {*} value The value to check.
     * @param {boolean} [notEmpty] Specifies if `value` must be not empty.
     * @returns {boolean} Returns `true` or `false` accordingly to the check.
     */
    module.exports = function isObject(value, notEmpty) {
        return _.isObject(value) && !isArray(value) && !isFunction(value) && (isVoid(notEmpty) || xnor(_.values(value).length, notEmpty));
    };

}());