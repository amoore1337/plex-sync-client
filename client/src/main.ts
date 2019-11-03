import Vue from 'vue';
import vuetify from './plugins/vuetify';
import App from './App.vue';
import router from './router';
import numeral from 'numeral';
import numFormat from 'vue-filter-number-format';

Vue.filter('numFormat', numFormat(numeral));
Vue.config.productionTip = false;

new Vue({
  router,
  vuetify,
  render: (h) => h(App),
}).$mount('#app');
