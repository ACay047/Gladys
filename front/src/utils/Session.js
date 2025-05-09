import { ERROR_MESSAGES, WEBSOCKET_MESSAGE_TYPES } from '../../../server/utils/constants';
import config from '../config';
import { Dispatcher } from './Dispatcher';

class Session {
  constructor() {
    this.user = null;
    this.profilePicture = null;
    this.initialized = false;
    this.dispatcher = new Dispatcher();
    this.websocketConnected = false;
    this.ws = null;
  }

  setRefreshAccessTokenFunction(func) {
    this.refreshAccessToken = func;
  }

  init() {
    if (this.initialized) {
      return null;
    }
    const user = this.getUser();
    if (user && this.user.access_token) {
      this.connect();
      this.initialized = true;
    }
  }

  reset() {
    this.user = null;
    this.profilePicture = null;
    this.initialized = false;
    localStorage.clear();
  }

  isConnected() {
    return this.user !== null;
  }

  connect() {
    const websocketUrl = config.webSocketUrl || window.location.origin.replace('http', 'ws');
    if (this.ws && this.ws.close) {
      this.ws.close();
    }
    this.ws = new WebSocket(websocketUrl);
    this.ws.onopen = () => {
      this.websocketOpened = true;
      this.ws.send(
        JSON.stringify({
          type: 'authenticate.request',
          payload: {
            accessToken: this.user.access_token
          }
        })
      );
      this.ws.onmessage = e => {
        const { data } = e;
        const { type, payload } = JSON.parse(data);
        // Only dispatch connected websocket message in case we are authenticated
        if (type === WEBSOCKET_MESSAGE_TYPES.AUTHENTICATION.CONNECTED) {
          this.websocketConnected = true;
          this.dispatcher.dispatch('websocket.connected', { connected: true });
        }
        this.dispatcher.dispatch(type, payload);
      };
    };
    this.ws.onerror = e => {
      console.error('Error', e);
    };
    this.ws.onclose = e => {
      console.error(e);
      if (this.websocketOpened) {
        this.websocketOpened = false;
        this.websocketConnected = false;
        this.dispatcher.dispatch('websocket.connected', { connected: false });
        if (e.reason === ERROR_MESSAGES.INVALID_ACCESS_TOKEN) {
          delete this.user.access_token;
          this.saveUser(this.user);
          this.refreshAccessToken();
        } else if (e.code !== 1005 && e.code !== 1000) {
          setTimeout(() => {
            this.connect();
          }, 1000);
        }
      }
    };
  }

  getUser() {
    if (this.user) {
      return this.user;
    }
    const data = localStorage.getItem('user');
    if (data) {
      this.user = JSON.parse(data);
    }
    return this.user;
  }

  setTabletModeCurrentHouseSelector(houseSelector) {
    if (houseSelector) {
      localStorage.setItem('current_house_selector', houseSelector);
    } else {
      localStorage.removeItem('current_house_selector');
    }
  }

  getTabletModeCurrentHouseSelector() {
    return localStorage.getItem('current_house_selector');
  }

  getRefreshToken() {
    const user = this.getUser();
    if (user) {
      return user.refresh_token;
    }
    return null;
  }

  getAccessToken() {
    const user = this.getUser();
    if (user) {
      return user.access_token;
    }
    return null;
  }

  setAccessToken(accessToken) {
    const newUser = Object.assign({}, this.user, {
      access_token: accessToken
    });
    this.saveUser(newUser);
  }

  getProfilePicture() {
    if (this.profilePicture) {
      return this.profilePicture;
    }
    const data = localStorage.getItem('profile_picture');
    if (data) {
      this.profilePicture = data;
    }

    return this.profilePicture;
  }

  saveUser(user) {
    const mergedUser = Object.assign({}, this.user, user);
    this.user = mergedUser;
    localStorage.setItem('user', JSON.stringify(mergedUser));
  }

  saveProfilePicture(profilePicture) {
    this.profilePicture = profilePicture;
    localStorage.setItem('profile_picture', profilePicture);
  }
}

export { Session };
