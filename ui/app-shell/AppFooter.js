import { ref, computed, watch, defineProps } from 'vue'
import { defineComponent, getTemplate } from '../../lib/vue-helpers.js';
import { AppToolbar } from '../AppToolbar.js';

export const AppFooter = defineComponent(
  getTemplate('app-footer'),
  (props, ctx) => {
    const handleRunningToggle = () => {
      isRunning.value = !isRunning.value;
    }
    
    return {}
  }, {
    components: {
      'app-toolbar': AppToolbar,
    }
  },
);
