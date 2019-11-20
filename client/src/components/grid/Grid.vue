<template>
  <table class="grid">
    <grid-row class="header" :expandable-offset="allowExpand">
      <th class="header-cell" v-for="(header, index) in headers" :key="index" :style="{ flex: header.size }">
        {{ header.label }}
      </th>
    </grid-row>
    <div class="grid-body" :class="{selectable: selectable}">
      <slot></slot>
    </div>
  </table>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import GridRow from './GridRow.vue';

export interface IGridHeader {
  label: string;
  sortable: boolean;
  size: number;
}

@Component({
  components: {
    GridRow,
  },
})
export default class Grid extends Vue {
  @Prop() private allowExpand!: boolean;
  @Prop() private selectable!: boolean;
  @Prop() private headers!: IGridHeader[];
}
</script>

<style scoped lang="scss">
  .grid {
    border: 1px solid $light-gray-1;
    border-radius: 8px;
    width: 100%;
    padding: 0;
    position: relative;
    border-spacing: 0;

    .grid-row {
      padding: 0 20px;
      border-bottom: 1px solid $light-gray-1;

      &:last-child {
        border-bottom: none;
      }

      &.header {
        border-width: 2px;
        .header-cell {
          display: flex;
          font-weight: normal;
        }
      }
    }

    .selectable {
      .grid-row {
        cursor: pointer;
        &:hover {
          background-color: $light-gray-4;
        }
      }
    }

  }
</style>
