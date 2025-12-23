import { ref, computed, watch, defineProps } from 'vue'
import { defineComponent, getTemplate } from '../../lib/vue-helpers.js';
import { AppToolbar } from '../AppToolbar.js';

export const AppFooter = defineComponent(
  getTemplate('app-footer'),
  (props, ctx) => {
    
    // const emitn = defineEmit(['toggle-running-click'])
    const isRunning = ref(true);
    console.warn('isRunning', isRunning.value)
    
    // watch(isRunning, (value) => {
    //   console.warn('isRunning', isRunning.value)
    // })
    
    const handleRunningToggle = () => {
      isRunning.value = !isRunning.value;
    }
    
    // const handleClick = () => {
    //   emit('toggle-running-click')
    // }
    
    return {
      isRunning,
      handleRunningToggle,
    }
  }, {
    components: {
      'app-toolbar': AppToolbar,
    }
  },
);

// AppFooter.props = ['isRunning']