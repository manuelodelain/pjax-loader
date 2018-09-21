import EventEmitter from 'tiny-emitter';
import $ from 'jquery';
import filterBrowserSyncUrl from 'utils/browsersync/filter-url';

export default class SPAManager extends EventEmitter{
  constructor (settings = {}){
    super();

    this.initialized = false;

    // Does the History API available ?
    if (!window.history) return;

    // default settings
    this.listenLinks = true;
    this.linksSelector = 'a';
    this.clickEvent = document.ontouchstart ? 'touchstart' : 'click';

    // override default settings if needed
    for (let key in settings) {
      if (typeof this[key] !== 'undefined') this[key] = settings[key];
    }

    this.init();
  }

  init () {
    this.initialized = true;

    this.loadingUrls = [];
    this.currentPageUrl = null;
    this.isLoading = false;

    // first state
    window.history.replaceState({
      href: window.location.href,
      isFirstState: true
    }, '', window.location.href);

    window.addEventListener('popstate', this.onPopState.bind(this));

    if (this.listenLinks) {
      document.addEventListener('click', event => {
        if (event.currentTarget.tagName.toLowerCase() !== 'a') return;

        this.onLinkClick(event);
      });
    }
  }

  loadCurrentPage (url){
    if (!this.initialized) return;

    this.isLoading = true;
    this.currentPageUrl = url;

    this.emit('loading', url);

    return this.loadPage(url);
  }

  loadPage (url) {
    if (!this.initialized) return;
    
    if (this.loadingUrls.indexOf(url) !== -1) return;

    this.loadingUrls.push(url);

    return window.fetch(url)
      .then(this.onPageLoaded.bind(this));
  }

  pushState (state, url){
    window.history.pushState(state, '', url);
  }

  replaceState (state, url, merge = false){
    if (merge){
      state = Object.assign({}, window.history.state, state);
    }

    window.history.replaceState(state, '', url);
  }

  gotoHref (href, pathname){
    if (pathname === window.location.pathname) return;

    const state = {href};

    this.pushState(state, href);

    this.loadCurrentPage(href);
  }

  /**
   * @see https://github.com/visionmedia/page.js/blob/master/index.js
   * @return {Boolean}
   */
  isSameOrigin (url){
    var origin = location.protocol + '//' + location.hostname;

    if (location.port) origin += ':' + location.port;

    return (url && (0 === url.indexOf(origin)));
  }

  onPageLoaded (response){
    this.loadingUrls.splice(this.loadingUrls.indexOf(response.url), 1);

    if (response.url === this.currentPageUrl && this.isLoading){
      const data = {
        pageData: response.text(),
        status: response.status,
        url: response.url
      };

      this.isLoading = false;
      
      this.emit('loaded', data);
    }
  }

  onLinkClick (event){
    if (!this.initialized || event.defaultPrevented) return;

    const element = event.currentTarget;
    const url = element.getAttribute('href');
    const href = element.href;

    if (!url || !url.length) return;

    if (url.indexOf('mailto:') > -1) return;

    if (!isSameOrigin(href)) return;

    if (element.target) return;

    event.preventDefault();

    this.gotoHref(href, element.pathname);
  }

  onPopState (event){
    if (!event.state) return;

    this.emit('popState', event);

    if (event.defaultPrevented) return;

    if (event.state.href){
      this.loadCurrentPage(event.state.href);
    }
  }
}

