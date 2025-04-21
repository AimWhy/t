<template>
    <div v-size-ob="handleSizeChange" class="scroll-container">
        <div class="v-scroll">
            <div class="content">
                <slot></slot>
            </div>
        </div>
    </div>
</template>

<script setup>
// v-size-ob 是通过 ResizeObserver 实现dom元素宽高变化的监听
import { reactive } from 'vue'

const size = reactive({
    w: 0,
    h: 0
})
function handleSizeChange(w, h) {
    size.w = w
    size.h = h
}
</script>

<style>
.scroll-container {
    height: 100%;
    width: 100%;
}
.v-scroll {
    --w: calc(v-bind(size.w) * 1px);
    --h: calc(v-bind(size.h) * 1px);
    width: var(--h);
    height: var(--w);
    position: relative;
    transform-origin: left top;
    transform: translateY(var(--h)) rotate(-90deg);
    overflow: hidden scroll;
}
.v-scroll::-webkit-scrollbar {
    display: none;
}
.content {
    width: var(--w);
    height: var(--h);
    position: absolute;
    left: var(--h);
    transform-origin: left top;
    transform: rotate(90deg);
}
</style>