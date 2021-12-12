import React, { useEffect } from 'react';
import type { DraggableSyntheticListeners } from '@dnd-kit/core';
import type { Transform } from '@dnd-kit/utilities';
import { useNavigation } from '@react-navigation/native';
import { API, graphqlOperation } from "@aws-amplify/api";
import { CSS } from '@dnd-kit/utilities';

const oldDate = new Date();
oldDate.setDate(oldDate.getDate() - 2);
export interface Props {
  dragOverlay?: boolean;
  color?: string;
  disabled?: boolean;
  dragging?: boolean;
  handle?: boolean;
  height?: number;
  index?: number;
  fadeIn?: boolean;
  transform?: Transform | null;
  listeners?: DraggableSyntheticListeners;
  sorting?: boolean;
  style?: React.CSSProperties;
  transition?: string | null;
  wrapperStyle?: React.CSSProperties;
  value: React.ReactNode;
  onRemove?(): void;
  renderItem?(args: {
    dragOverlay: boolean;
    dragging: boolean;
    sorting: boolean;
    index: number | undefined;
    fadeIn: boolean;
    listeners: DraggableSyntheticListeners;
    ref: React.Ref<HTMLElement>;
    style: React.CSSProperties | undefined;
    transform: Props['transform'];
    transition: Props['transition'];
    value: Props['value'];
  }): React.ReactElement;
}

export const Item = React.memo(
  React.forwardRef<HTMLLIElement, Props>(
    (
      {
        color,
        dragOverlay,
        dragging,
        disabled,
        fadeIn,
        handle,
        height,
        index,
        listeners,
        onRemove,
        renderItem,
        sorting,
        style,
        transition,
        transform,
        value,
        wrapperStyle,
        ...props
      },
      ref
    ) => {
      const navigation = useNavigation();

      return renderItem ? (
        renderItem({
          dragOverlay: Boolean(dragOverlay),
          dragging: Boolean(dragging),
          sorting: Boolean(sorting),
          index,
          fadeIn: Boolean(fadeIn),
          listeners,
          ref,
          style,
          transform,
          transition,
          value,
        })
      ) : (
        <li
          style={
            {
              ...wrapperStyle,
              opacity: dragging ? '0' : '1',
              listStyleType: 'none',
              transition: sorting ? 'transform ease-in-out 0.15s' : '',
              transform: CSS.Transform.toString(transform)
            } as React.CSSProperties
          }
          ref={ref}
          onClick={() => { navigation.navigate('task', { id: value.id }); }}
          onContextMenu={async (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to delete this task?')) { await API.graphql(graphqlOperation(`mutation {delete_tasks_by_pk(id: "${value.id}") {id}}`)); }
          }}
        >
          <div
            style={{ ...style, color: '#fff', fontFamily: 'arial', width: '100%' }}
            data-cypress="draggable-item"
            {...(!handle ? listeners : undefined)}
            {...props}
            tabIndex={!handle ? 0 : undefined}
          >
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', cursor: dragOverlay ? 'grabbing' : 'grab', padding: 15, margin: 10, marginBottom: 0, borderRadius: 10, backgroundColor: dragOverlay ? '#333333' : '#161616' }}>{/*, height: 90*/}
              <div style={{ width: '15%', }}><img style={{ width: 30, height: 30, borderRadius: 5, borderWidth: 1, borderColor: '#fff', borderStyle: 'solid' }} src={`https://files.productabot.com/public/${value.image}`} /></div>
              <div style={{ width: '85%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
                <div style={{ color: '#aaaaaa', fontSize: 10, textAlign: 'left', marginTop: 5 }}>{new Date(value.created_at).toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                <div style={{ fontSize: 14 }}>{value.details}</div>
                <div style={{ fontSize: 10, color: '#aaaaaa' }}>{value.count} comment{value.count !== 1 ? 's' : ''}{value.category ? `, #${value.category}` : ``}</div>
              </div>
            </div>
          </div>
        </li>
      );
    }
  )
);
