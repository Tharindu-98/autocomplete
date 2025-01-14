/** @jsx h */
import { autocomplete } from '@algolia/autocomplete-js';
import { createQuerySuggestionsPlugin } from '@algolia/autocomplete-plugin-query-suggestions';
import { createLocalStorageRecentSearchesPlugin } from '@algolia/autocomplete-plugin-recent-searches';
import { h, Fragment } from 'preact';

import {
  debouncedSetInstantSearchUiState,
  getInstantSearchCurrentCategory,
  getInstantSearchUiState,
  getInstantSearchUrl,
  INSTANT_SEARCH_HIERARCHICAL_ATTRIBUTE,
  INSTANT_SEARCH_INDEX_NAME,
  setInstantSearchUiState,
} from './instantsearch';
import { isModifierEvent } from './isModifierEvent';
import { searchClient } from './searchClient';

function onSelect({ setIsOpen, setQuery, event, query, category }) {
  // You want to trigger the default browser behavior if the event is modified.
  if (isModifierEvent(event)) {
    return;
  }

  setQuery(query);
  setIsOpen(false);
  setInstantSearchUiState({
    query,
    hierarchicalMenu: {
      [INSTANT_SEARCH_HIERARCHICAL_ATTRIBUTE]: [category],
    },
  });
}

function getItemUrl({ query, category }) {
  return getInstantSearchUrl({
    query,
    hierarchicalMenu: {
      [INSTANT_SEARCH_HIERARCHICAL_ATTRIBUTE]: [category],
    },
  });
}

function ItemWrapper({ children, query, category }) {
  const uiState = {
    query,
    hierarchicalMenu: {
      [INSTANT_SEARCH_HIERARCHICAL_ATTRIBUTE]: [category],
    },
  };

  return (
    <a
      className="aa-ItemLink"
      href={getInstantSearchUrl(uiState)}
      onClick={(event) => {
        if (!isModifierEvent(event)) {
          // Bypass the original link behavior if there's no event modifier
          // to set the InstantSearch UI state without reloading the page.
          event.preventDefault();
        }
      }}
    >
      {children}
    </a>
  );
}

const recentSearchesPlugin = createLocalStorageRecentSearchesPlugin({
  key: 'instantsearch',
  limit: 3,
  transformSource({ source }) {
    return {
      ...source,
      getItemUrl({ item }) {
        return getItemUrl({
          query: item.label,
          category: item.category,
        });
      },
      onSelect({ setIsOpen, setQuery, item, event }) {
        onSelect({
          setQuery,
          setIsOpen,
          event,
          query: item.label,
          category: item.category,
        });
      },
      templates: {
        ...source.templates,
        // Update the default `item` template to wrap it with a link
        // and plug it to the InstantSearch router.
        item(params) {
          const { children } = (source.templates.item(params) as any).props;

          return (
            <ItemWrapper
              query={params.item.label}
              category={params.item.category}
            >
              {children}
            </ItemWrapper>
          );
        },
      },
    };
  },
});

const querySuggestionsPluginInCategory = createQuerySuggestionsPlugin({
  searchClient,
  indexName: 'instant_search_demo_query_suggestions',
  getSearchParams() {
    const currentCategory = getInstantSearchCurrentCategory();

    return recentSearchesPlugin.data.getAlgoliaSearchParams({
      hitsPerPage: 3,
      facetFilters: [
        `${INSTANT_SEARCH_INDEX_NAME}.facets.exact_matches.${INSTANT_SEARCH_HIERARCHICAL_ATTRIBUTE}.value:${currentCategory}`,
      ],
    });
  },
  transformSource({ source }) {
    const currentCategory = getInstantSearchCurrentCategory();

    return {
      ...source,
      sourceId: 'querySuggestionsPluginInCategory',
      getItemUrl({ item }) {
        return getItemUrl({
          query: item.query,
          category: currentCategory,
        });
      },
      onSelect({ setIsOpen, setQuery, event, item }) {
        onSelect({
          setQuery,
          setIsOpen,
          event,
          query: item.query,
          category: currentCategory,
        });
      },
      getItems(params) {
        if (!currentCategory) {
          return [];
        }

        return source.getItems(params);
      },
      templates: {
        ...source.templates,
        header({ items }) {
          if (items.length === 0) {
            return null;
          }

          return (
            <Fragment>
              <span className="aa-SourceHeaderTitle">In {currentCategory}</span>
              <div className="aa-SourceHeaderLine" />
            </Fragment>
          );
        },
        item(params) {
          const { children } = (source.templates.item(params) as any).props;

          return (
            <ItemWrapper query={params.item.query} category={currentCategory}>
              {children}
            </ItemWrapper>
          );
        },
      },
    };
  },
});

const querySuggestionsPlugin = createQuerySuggestionsPlugin({
  searchClient,
  indexName: 'instant_search_demo_query_suggestions',
  getSearchParams() {
    const currentCategory = getInstantSearchCurrentCategory();

    if (!currentCategory) {
      return recentSearchesPlugin.data.getAlgoliaSearchParams({
        hitsPerPage: 6,
      });
    }

    return recentSearchesPlugin.data.getAlgoliaSearchParams({
      hitsPerPage: 3,
      facetFilters: [
        `${INSTANT_SEARCH_INDEX_NAME}.facets.exact_matches.${INSTANT_SEARCH_HIERARCHICAL_ATTRIBUTE}.value:-${currentCategory}`,
      ],
    });
  },
  categoryAttribute: [
    INSTANT_SEARCH_INDEX_NAME,
    'facets',
    'exact_matches',
    INSTANT_SEARCH_HIERARCHICAL_ATTRIBUTE,
  ],
  transformSource({ source }) {
    const currentCategory = getInstantSearchCurrentCategory();

    return {
      ...source,
      sourceId: 'querySuggestionsPlugin',
      getItemUrl({ item }) {
        return getItemUrl({
          query: item.query,
          category: item.__autocomplete_qsCategory,
        });
      },
      onSelect({ setIsOpen, setQuery, event, item }) {
        onSelect({
          setQuery,
          setIsOpen,
          event,
          query: item.query,
          category: item.__autocomplete_qsCategory,
        });
      },
      getItems(params) {
        if (!params.state.query) {
          return [];
        }

        return source.getItems(params);
      },
      templates: {
        ...source.templates,
        header({ items }) {
          if (!currentCategory || items.length === 0) {
            return null;
          }

          return (
            <Fragment>
              <span className="aa-SourceHeaderTitle">In other categories</span>
              <div className="aa-SourceHeaderLine" />
            </Fragment>
          );
        },
        item(params) {
          const { children } = (source.templates.item(params) as any).props;

          return (
            <ItemWrapper
              query={params.item.query}
              category={params.item.__autocomplete_qsCategory}
            >
              {children}
            </ItemWrapper>
          );
        },
      },
    };
  },
});

const searchPageState = getInstantSearchUiState();

export function startAutocomplete() {
  autocomplete({
    container: '#autocomplete',
    placeholder: 'Search for products',
    openOnFocus: true,
    plugins: [
      recentSearchesPlugin,
      querySuggestionsPluginInCategory,
      querySuggestionsPlugin,
    ],
    detachedMediaQuery: 'none',
    initialState: {
      query: searchPageState.query || '',
    },
    navigator: {
      navigate() {
        // We don't navigate to a new page because we leverage the InstantSearch
        // UI state API.
      },
    },
    onSubmit({ state }) {
      setInstantSearchUiState({ query: state.query });
    },
    onReset() {
      setInstantSearchUiState({
        query: '',
        hierarchicalMenu: {
          [INSTANT_SEARCH_HIERARCHICAL_ATTRIBUTE]: [],
        },
      });
    },
    onStateChange({ prevState, state }) {
      if (prevState.query !== state.query) {
        debouncedSetInstantSearchUiState({ query: state.query });
      }
    },
  });
}
