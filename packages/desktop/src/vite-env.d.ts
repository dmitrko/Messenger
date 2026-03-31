/// <reference types="vite/client" />

declare module "*.png" {
    const value: string;
    export default value;
}

declare module "react-draggable" {
    import * as React from "react";
    export interface DraggableProps {
        axis?: "both" | "x" | "y" | "none";
        bounds?: { left?: number; top?: number; right?: number; bottom?: number } | string | false;
        defaultClassName?: string;
        defaultClassNameDragging?: string;
        defaultClassNameDragged?: string;
        defaultPosition?: { x: number; y: number };
        positionOffset?: { x: number | string; y: number | string };
        position?: { x: number; y: number };
        scale?: number;
        onStart?: (e: any, data: any) => void | false;
        onDrag?: (e: any, data: any) => void | false;
        onStop?: (e: any, data: any) => void | false;
        onMouseDown?: (e: MouseEvent) => void;
        handle?: string;
        cancel?: string;
        grid?: [number, number];
        offsetParent?: HTMLElement;
        enableUserSelectHack?: boolean;
        disabled?: boolean;
        children?: React.ReactNode;
    }
    export default class Draggable extends React.Component<DraggableProps> { }
}
