import { ref, computed, watch, defineProps } from 'vue'
import { defineComponent, getTemplate } from '../lib/vue-helpers.js';
import { useAppState } from '../store/app.store.js';

export const AppToolbar = defineComponent(
  getTemplate('app-toolbar'),
  (props, ctx) => {
    const { isRunning, setRunning } = useAppState();
    // const isRunning = computed(() => props.isRunning)
    
    // watch(isRunning, (value) => {
    //   console.warn('isRunning', isRunning.value)
    // })
    console.warn({ ctx })
   
    const handleClick = () => {
      console.warn('TOOLBAR handleClick', isRunning)
      // ctx.emit('toggle-running-click')
      
      setRunning(!isRunning.value);
    }
    
    return {
      isRunning,
      handleClick,
    }
  },
);

// AppToolbar.props = ['isRunning']
