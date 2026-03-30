import { createRoot } from 'react-dom/client'
import SelectionToolbar from './components/SelectionToolbar'
import { applyThemePreferences } from './utils/theme'
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import '@fontsource/lora/400.css'
import '@fontsource/lora/500.css'
import '@fontsource/lora/600.css'
import './toolbar.css'

async function syncToolbarTheme(): Promise<void> {
	if (!window.api?.getAllConfig) {
		return
	}

	const config = await window.api.getAllConfig() as Record<string, unknown>
	applyThemePreferences(
		(config.theme as string) || 'system',
		(config.themeColor as string) || 'indigo'
	)
}

void syncToolbarTheme()

const root = createRoot(document.getElementById('root')!)
root.render(<SelectionToolbar />)
