export default {
	compileOptions: {
		filename: 'src/components/FooSwitcher.svelte',
		cssHash(css, hash) {
			return `sv-${hash(css)}`
		}
	}
}
