import { getNavigator } from './getNavigator';
import { InternalAutocompleteOptions, AutocompleteOptions } from './types';
import {
  generateAutocompleteId,
  getItemsCount,
  getNormalizedSources,
  flatten,
} from './utils';

export function getDefaultProps<TItem>(
  props: AutocompleteOptions<TItem>
): InternalAutocompleteOptions<TItem> {
  const environment: InternalAutocompleteOptions<
    unknown
  >['environment'] = (typeof window !== 'undefined'
    ? window
    : {}) as typeof window;
  const plugins = props.plugins || [];

  return {
    debug: false,
    openOnFocus: false,
    placeholder: '',
    autoFocus: false,
    defaultSelectedItemId: null,
    stallThreshold: 300,
    environment,
    shouldDropdownShow: ({ state }) => getItemsCount(state) > 0,
    ...props,
    // Since `generateAutocompleteId` triggers a side effect (it increments
    // and internal counter), we don't want to execute it if unnecessary.
    id: props.id ?? generateAutocompleteId(),
    // The following props need to be deeply defaulted.
    initialState: {
      selectedItemId: null,
      query: '',
      completion: null,
      collections: [],
      isOpen: false,
      status: 'idle',
      context: {},
      ...props.initialState,
    },
    plugins,
    onStateChange(params) {
      props.onStateChange?.(params);
      plugins.forEach((plugin) => {
        plugin.onStateChange?.(params);
      });
    },
    onSubmit(params) {
      props.onSubmit?.(params);
      plugins.forEach((plugin) => {
        plugin.onSubmit?.(params);
      });
    },
    getSources(options) {
      return Promise.all(
        [...plugins.map((plugin) => plugin.getSources), props.getSources]
          .filter(Boolean)
          .map((getSources) => getNormalizedSources(getSources!, options))
      )
        .then((nested) => flatten(nested))
        .then((sources) =>
          sources.map((source) => ({
            ...source,
            onSelect(params) {
              source.onSelect(params);
              plugins.forEach((plugin) => {
                plugin.subscribed?.onSelect?.(params);
              });
            },
          }))
        );
    },
    navigator: {
      ...getNavigator({ environment }),
      ...props.navigator,
    },
  };
}
