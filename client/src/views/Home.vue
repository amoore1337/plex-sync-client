<template>
  <div class="home-container">
    <v-sheet class="top-nav" elevation="5">
      <h1>Plex Cache Manager</h1>
      <v-btn text icon @click="openSettings">
        <v-icon medium>mdi-tune</v-icon>
      </v-btn>
    </v-sheet>
    <div class="grid-container">
      <div class="grid-controls">
        <content-toggle></content-toggle>
      </div>
      <tv-grid v-bind:tvShows="content.tv" v-bind:loading="loadingContent" :progress="seasonProgress" v-if="contentType === 'tv'"></tv-grid>
      <movies-grid v-bind:movies="content.movies" v-bind:loading="loadingContent" :progress="movieProgress" v-else></movies-grid>
    </div>
    <v-dialog v-model="showSettings" max-width="700">
      <v-card>
        <v-card-title>
          Settings
        </v-card-title>
        <v-card-text>
          <form @submit.prevent="saveConfig">
            <v-text-field class="name-input" v-model="managerIp" label="Manager IP" required></v-text-field>
            <v-text-field class="name-input" v-model="managerKey" label="Manager Key" required></v-text-field>
            <v-text-field class="name-input" v-model="managerSecret" label="Manager Secret" required></v-text-field>
            <v-text-field class="name-input" v-model="plexIp" label="Plex IP"></v-text-field>
            <v-text-field class="name-input" v-model="plexToken" label="Plex Token"></v-text-field>
          </form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="showSettings = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveConfig" :disabled="savingSettings">
            <v-icon dark medium>mdi-content-save</v-icon>
            {{savingSettings ? 'Loading...' : 'Save'}}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator';
import ContentToggle from '@/components/ContentToggle.vue';
import TvGrid from '@/components/tv/TvGrid.vue';
import MoviesGrid from '@/components/movies/MoviesGrid.vue';
import io from 'socket.io-client';
import { find, findIndex } from 'lodash';
import axios from 'axios';

@Component({
  components: {
    ContentToggle,
    TvGrid,
    MoviesGrid,
  },
})
export default class Home extends Vue {
  private contentType = '';
  private content: { [key: string]: any[] } = { tv: [], movies: [] };
  private movieProgress: { token: string, progress: number }[] = [];
  private seasonProgress: { token: string, show_token: string, progress: number }[] = [];
  private showProgress: { type: string, token: string, progress: number }[] = [];
  private loadingContent = false;
  private savingSettings = false;
  private showSettings = false;
  private managerIp = '';
  private managerKey = '';
  private managerSecret = '';
  private plexIp = '';
  private plexToken = '';
  private socket: any;

  private mounted() {
    this.updateGridDisplay();
    this.contentType = this.$route.query.type as string;
    this.socket = io('', {transports: ['websocket']});
    this.socket.on('in-progress-downloads', (data: any) => {
      data.pending_content.forEach((pending: any) => this.updateContent(pending));

      if (data.completed_content) {
        this.updateContent(data.completed_content);
      }
    });
  }

  @Watch('$route.query.type')
  private updateGridDisplay() {
    this.contentType = this.$route.query.type as string;
    this.loadContent();
  }

  private loadContent(force = false) {
    const routeMap: {[key: string]: string} = { tv: 'shows', movies: 'movies' };
    if (!this.contentType) { return; }
    if (force || !this.content[this.contentType].length) {
      this.loadingContent = true;
      return axios.get(`/api/${routeMap[this.contentType]}`).then((res: any) => {
        this.content[this.contentType] = res.data;
        this.loadingContent = false;
      }).catch(() => this.loadingContent = false);
    }
  }

  private updateContent(content: any) {
    const type = (['show', 'season', 'episode'].indexOf(content.type) > -1) ? 'tv' : 'movies';

    // If we haven't loaded that content type yet, bail
    if (!this.content[type]) { return; }

    // TODO: Support more granular statuses:
    const eventToStatusMap: { [key: string]: any } = {
      pending: 'in-progress',
      processing: 'in-progress',
      downloading: 'in-progress',
      unpacking: 'in-progress',
      cleaning: 'in-progress',
    };

    const updatedStatus = content.status || eventToStatusMap[(content.last_event) as string];
    if (content.type === 'show') {
      const show = find(this.content[type], { token: content.token });
      show.status = updatedStatus;
      show.seasons.forEach((season: any) => {
        season.status = updatedStatus;
        season.episodes.forEach((episode: any) => episode.status = updatedStatus);
      });
    } else if (content.type === 'season') {
      const show = find(this.content[type], { token: content.show_token });
      show.status = updatedStatus;
      const season = find(show.seasons, { token: content.token });
      season.status = updatedStatus;
      season.episodes.forEach((episode: any) => episode.status = updatedStatus);
      if (content.progress) {
        const index = findIndex(this.seasonProgress, { token: content.token });
        if (index > -1) {
          this.seasonProgress[index].progress = content.progress;
        } else {
          this.seasonProgress.push({
            token: content.token,
            show_token: season.show_token,
            progress: content.progress
          });
        }
      }
    } else if (content.type === 'episode') {
      const show = find(this.content[type], { token: content.show_token });
      show.status = updatedStatus;
      const season = find(show.seasons, { token: content.season_token });
      season.status = updatedStatus;
      const episode = find(season.episodes, { token: content.token });
      episode.status = updatedStatus;
    } else if (content.type === 'movie') {
      const movie = find(this.content[type], { token: content.token });
      movie.status = updatedStatus;

      if (content.progress) {
        const index = findIndex(this.movieProgress, { token: content.token });
        if (index > -1) {
          this.movieProgress[index].progress = content.progress;
        } else {
          this.movieProgress.push({ token: content.token, progress: content.progress });
        }
      }
    }
  }

  private openSettings() {
    axios.get('/api/manager-config').then((response: any) => {
      if (response.data.manager) {
        this.managerIp = response.data.manager.hostname;
        this.managerKey = response.data.manager.client_id;
        this.managerSecret = response.data.manager.client_secret;
      }

      if (response.data.plex) {
        this.plexIp = response.data.plex.hostname;
        this.plexToken = response.data.plex.token;
      }

      this.showSettings = true;
    });
  }

  private saveConfig() {
    this.savingSettings = true;
    axios.post('/api/manager-config', {
      hostname: this.managerIp,
      client_id: this.managerKey,
      client_secret: this.managerSecret,
      plex_hostname: this.plexIp,
      plex_token: this.plexToken,
    }).then(() => {
      this.showSettings = false;
      this.savingSettings = false;
      this.loadContent(true);
    }).catch(() => this.savingSettings = false);
  }
}
</script>
<style scoped lang="scss">
.home-container {
  display: flex;
  flex-direction: column;

  h1 {
    font-size: 1.3rem;
  }

  .top-nav {
    display: flex;
    height: 80px;
    width: 100%;
    padding: 0 20px;
    align-items: center;
    justify-content: space-between;
    z-index: 10;
  }
}

.grid-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: calc(100vh - 85px);
  overflow: auto;
  align-items: flex-start;
  padding: 0 20px 20px 20px;
  background-color: white;

  .grid-controls {
    width: 100%;
  }
}
</style>
