import { createRoot } from 'react-dom/client'
import App from './App'
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import '@fontsource/lora/400.css'
import '@fontsource/lora/500.css'
import '@fontsource/lora/600.css'
import './global.css'

const root = createRoot(document.getElementById('root')!)
root.render(<App />)
