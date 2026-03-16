/**
 * ESLint plugin for Vue 3 official best practices
 */

import requireScriptSetup from './rules/require-script-setup'
import noSetupTopLevelSideEffects from './rules/no-setup-top-level-side-effects'
import noAsyncComputedGetter from './rules/no-async-computed-getter'
import preferShallowWatch from './rules/prefer-shallow-watch'
import noTemplateComplexExpressions from './rules/no-template-complex-expressions'
import consistentDefinepropsEmits from './rules/consistent-defineprops-emits'
import preferTypedDefineprops from './rules/prefer-typed-defineprops'
import requireUsePrefixForComposables from './rules/require-use-prefix-for-composables'
import noComposableConditionalHooks from './rules/no-composable-conditional-hooks'
import noComposableDomAccessWithoutClientGuard from './rules/no-composable-dom-access-without-client-guard'
import piniaRequireDefineStoreId from './rules/pinia-require-defineStore-id'
import piniaNoDirectStateMutationOutsideActions from './rules/pinia-no-direct-state-mutation-outside-actions'
import piniaPreferStoreToRefsDestructure from './rules/pinia-prefer-storeToRefs-destructure'
import { recommended, strict } from './configs'

export default {
  meta: {
    name: 'eslint-plugin-vue-official-best-practices',
    version: '1.0.0',
  },
  rules: {
    'require-script-setup': requireScriptSetup,
    'no-setup-top-level-side-effects': noSetupTopLevelSideEffects,
    'no-async-computed-getter': noAsyncComputedGetter,
    'prefer-shallow-watch': preferShallowWatch,
    'no-template-complex-expressions': noTemplateComplexExpressions,
    'consistent-defineprops-emits': consistentDefinepropsEmits,
    'prefer-typed-defineprops': preferTypedDefineprops,
    'require-use-prefix-for-composables': requireUsePrefixForComposables,
    'no-composable-conditional-hooks': noComposableConditionalHooks,
    'no-composable-dom-access-without-client-guard': noComposableDomAccessWithoutClientGuard,
    'pinia-require-defineStore-id': piniaRequireDefineStoreId,
    'pinia-no-direct-state-mutation-outside-actions': piniaNoDirectStateMutationOutsideActions,
    'pinia-prefer-storeToRefs-destructure': piniaPreferStoreToRefsDestructure,
  },
  configs: {
    recommended,
    strict,
  },
}
