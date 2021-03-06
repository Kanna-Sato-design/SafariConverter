/**
 * This file is part of Adguard Browser Extension (https://github.com/AdguardTeam/AdguardBrowserExtension).
 *
 * Adguard Browser Extension is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Adguard Browser Extension is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Adguard Browser Extension.  If not, see <http://www.gnu.org/licenses/>.
 */

(function (adguard, api) {

    'use strict';

    /**
     * Filters unsupported rules from third-party sources
     *
     * @param ruleText
     */
    const filterUnsupportedRules = function (ruleText) {
        // uBO HTML filters
        if (ruleText.includes('##^')) {
            return false;
        }

        return true;
    };

    /**
     * Method that parses rule text and creates object of a suitable class.
     *
     * @param ruleText Rule text
     * @returns Filter rule object.
     */
    const _createRule = function (ruleText) {

        ruleText = ruleText ? ruleText.trim() : null;
        if (!ruleText) {
            return null;
        }
        const rule = null;
        try {

            const StringUtils = adguard.utils.strings;

            if (StringUtils.startWith(ruleText, api.FilterRule.COMMENT) ||
                StringUtils.contains(ruleText, api.FilterRule.OLD_INJECT_RULES) ||
                StringUtils.contains(ruleText, api.FilterRule.MASK_CONTENT_RULE) ||
                StringUtils.contains(ruleText, api.FilterRule.MASK_CONTENT_EXCEPTION_RULE) ||
                StringUtils.contains(ruleText, api.FilterRule.MASK_JS_RULE)) {
                // Empty or comment, ignore
                // Content rules are not supported
                return null;
            }

            if (!filterUnsupportedRules(ruleText)) {
                return null;
            }

            if (StringUtils.startWith(ruleText, api.FilterRule.MASK_WHITE_LIST)) {
                return new api.UrlFilterRule(ruleText);
            }

            if (api.FilterRule.findRuleMarker(ruleText, api.CssFilterRule.RULE_MARKERS, api.CssFilterRule.RULE_MARKER_FIRST_CHAR)) {
                return new api.CssFilterRule(ruleText);
            }

            if (api.FilterRule.findRuleMarker(ruleText, api.ScriptFilterRule.RULE_MARKERS, api.ScriptFilterRule.RULE_MARKER_FIRST_CHAR)) {
                return api.ScriptletRule.isAdguardScriptletRule(ruleText)
                    ? new api.ScriptletRule(ruleText)
                    : new api.ScriptFilterRule(ruleText);
            }

            return new api.UrlFilterRule(ruleText);
        } catch (ex) {
            adguard.console.warn("Cannot create rule: {1}, cause {2}", ruleText, ex);
        }

        return null;
    };

    /**
     * Convert rules to AdGuard syntax and create rule
     *
     * @param {string} ruleText Rule text
     * @returns Filter rule object. Either UrlFilterRule or CssFilterRule or ScriptFilterRule.
     */
    const createRule = (ruleText) => {
        let conversionResult = null;
        try {
            conversionResult = api.ruleConverter.convertRule(ruleText);
        } catch (ex) {
            adguard.console.debug('Cannot convert rule: {1}, cause {2}', ruleText, ex);
        }

        if (!conversionResult) {
            return null;
        }

        if (Array.isArray(conversionResult)) {
            const rules = conversionResult
                .map(rt => _createRule(rt))
                .filter(rule => rule !== null);

            // composite rule shouldn't be with without rules inside it
            if (rules.length === 0) {
                return null;
            }

            return new api.CompositeRule(ruleText, rules);
        }
        const rule = _createRule(conversionResult);
        if (conversionResult !== ruleText) {
            rule.ruleText = ruleText;
            rule.convertedRuleText = conversionResult;
        }

        return rule;
    };

    api.builder = {
        createRule: createRule
    };

})(adguard, adguard.rules);
