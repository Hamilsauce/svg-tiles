import { ref, computed, watch, defineProps } from 'vue'
import { defineComponent, getTemplate } from '../lib/vue-helpers.js';
// import { AppToolbar } from '../AppToolbar.js';

export const AppToolbar = defineComponent(
  getTemplate('app-toolbar'),
  (props, ctx) => {
    
    // const emit = defineEmit(['toggle-running-click'])
    const isRunning = computed(() => props.isRunning)
    console.warn('isRunning', isRunning.value)
    
    watch(isRunning, (value) => {
      console.warn('isRunning', isRunning.value)
    })
    console.warn({ ctx })
    const handleClick = () => {
      console.warn('TOOLBAR handleClick', isRunning)
      ctx.emit('toggle-running-click')
    }
    
    return {
      isRunning,
      handleClick,
    }
  },
);

AppToolbar.props = ['isRunning']