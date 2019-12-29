<template>
  <v-radio-group v-model="contentType" row>
    <v-radio label="TV Shows" value="tv" color="light-blue darken-1"></v-radio>
    <v-radio label="Movies" value="movies" color="light-blue darken-1"></v-radio>
  </v-radio-group>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';

@Component
export default class ContentToggle extends Vue {
  private contentType = '';

  private mounted() {
    const selectedType = this.$route.query.type as string;
    this.contentType = 'tv';
    if (selectedType && ['tv', 'movies'].indexOf(selectedType)) {
      this.contentType = selectedType;
    }
  }

  @Watch('contentType')
  private onContentTypeChange() {
    if (this.contentType !== this.$route.query.type) {
      this.$router.replace({query: { type: this.contentType }});
    }
  }
}
</script>

<style scoped lang="scss">
</style>
