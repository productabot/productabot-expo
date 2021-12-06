import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal, unstable_batchedUpdates } from "react-dom";
import {
  CancelDrop,
  closestCenter,
  rectIntersection,
  CollisionDetection,
  DndContext,
  DragOverlay,
  DropAnimation,
  defaultDropAnimation,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  Modifiers,
  useDroppable,
  UniqueIdentifier,
  useSensors,
  useSensor,
  MeasuringStrategy,
  PointerActivationConstraint
} from "@dnd-kit/core";
import {
  AnimateLayoutChanges,
  SortableContext,
  useSortable,
  arrayMove,
  defaultAnimateLayoutChanges,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  SortingStrategy,
  horizontalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Item } from "./Item";
import { Container } from "./Container";

const defaultInitializer = (index: number) => index;
const createRange = (
  length: number,
  initializer: (index: number) => any = defaultInitializer
) => {
  return [...new Array(length)].map((_, index) => initializer(index));
};

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  args.isSorting || args.wasDragging ? defaultAnimateLayoutChanges(args) : true;

function DroppableContainer({
  children,
  columns = 1,
  disabled,
  id,
  items,
  style,
  ...props
}: any & {
  disabled?: boolean;
  id: string;
  items: string[];
  style?: React.CSSProperties;
}) {
  const {
    active,
    attributes,
    isDragging,
    listeners,
    over,
    setNodeRef,
    transition,
    transform
  } = useSortable({
    id,
    data: {
      type: "container"
    },
    animateLayoutChanges
  });
  const isOverContainer = over
    ? (id === over.id && active?.data.current?.type !== "container") ||
    items.includes(over.id)
    : false;

  return (
    <Container
      ref={disabled ? undefined : setNodeRef}
      style={{
        ...style,
        transition,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : undefined
      }}
      hover={isOverContainer}
      handleProps={{
        ...attributes,
        ...listeners
      }}
      columns={columns}
      {...props}
    >
      {children}
    </Container>
  );
}

type Items = Record<string, string[]>;

interface Props {
  activationConstraint?: PointerActivationConstraint;
  adjustScale?: boolean;
  cancelDrop?: CancelDrop;
  columns?: number;
  containerStyle?: React.CSSProperties;
  getItemStyles?(args: {
    value: UniqueIdentifier;
    index: number;
    overIndex: number;
    isDragging: boolean;
    containerId: UniqueIdentifier;
    isSorting: boolean;
    isDragOverlay: boolean;
  }): React.CSSProperties;
  wrapperStyle?(args: { index: number }): React.CSSProperties;
  itemCount?: number;
  items?: Items;
  setItems?: any;
  saveTasks?: any;
  handle?: boolean;
  renderItem?: any;
  strategy?: SortingStrategy;
  modifiers?: Modifiers;
  minimal?: boolean;
  trashable?: boolean;
  scrollable?: boolean;
  vertical?: boolean;
}

export const TRASH_ID = "void";
const PLACEHOLDER_ID = "placeholder";
const empty: UniqueIdentifier[] = [];

export function MultipleContainers({
  activationConstraint,
  adjustScale = false,
  itemCount = 3,
  cancelDrop,
  columns,
  handle = false,
  items,
  setItems,
  saveTasks,
  containerStyle,
  getItemStyles = () => ({}),
  wrapperStyle = () => ({}),
  minimal = false,
  modifiers,
  renderItem,
  strategy = verticalListSortingStrategy,
  trashable = false,
  vertical = false,
  scrollable
}: Props) {
  // const [items, setItems] = useState(initialItems);
  const [containers, setContainers] = useState(Object.keys(items));
  const [activeId, setActiveId] = useState<string | null>(null);
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const recentlyMovedToNewContainer = useRef(false);
  const isSortingContainer = activeId ? containers.includes(activeId) : false;
  // Custom collision detection strategy optimized for multiple containers
  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      // Start by finding any intersecting droppable
      let overId = rectIntersection(args);

      if (activeId && activeId in items) {
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter(
            (container) => container.id in items
          )
        });
      }

      if (overId != null) {
        if (overId === TRASH_ID) {
          // If the intersecting droppable is the trash, return early
          // Remove this if you're not using trashable functionality in your app
          return overId;
        }

        if (overId in items) {
          const containerItems = items[overId];

          // If a container is matched and it contains items (columns 'A', 'B', 'C')
          if (containerItems.length > 0) {
            // Return the closest droppable within that container
            overId = closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter(
                (container) =>
                  container.id !== overId &&
                  containerItems.includes(container.id)
              )
            });
          }
        }

        lastOverId.current = overId;

        return overId;
      }

      // When a draggable item moves to a new container, the layout may shift
      // and the `overId` may become `null`. We manually set the cached `lastOverId`
      // to the id of the draggable item that was moved to the new container, otherwise
      // the previous `overId` will be returned which can cause items to incorrectly shift positions
      if (recentlyMovedToNewContainer.current) {
        lastOverId.current = activeId;
      }

      // If no droppable is matched, return the last match
      return lastOverId.current;
    },
    [activeId, items]
  );
  const [clonedItems, setClonedItems] = useState<Items | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint,
    }),
    useSensor(TouchSensor, {
      activationConstraint,
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );
  const findContainer = (id: string) => {
    if (id in items) {
      return id;
    }

    return Object.keys(items).find((key) => items[key].includes(id));
  };

  const getIndex = (id: string) => {
    const container = findContainer(id);

    if (!container) {
      return -1;
    }

    const index = items[container].indexOf(id);

    return index;
  };

  const onDragCancel = () => {
    if (clonedItems) {
      // Reset items to their original state in case items have been
      // Dragged across containrs
      setItems(clonedItems);
    }

    setActiveId(null);
    setClonedItems(null);
  };

  useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedToNewContainer.current = false;
    });
  }, [items]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always
        }
      }}
      onDragStart={({ active }) => {
        setActiveId(active.id);
        setClonedItems(items);
      }}
      onDragOver={({ active, over }) => {
        const overId = over?.id;

        if (!overId || overId === TRASH_ID || active.id in items) {
          return;
        }

        const overContainer = findContainer(overId);
        const activeContainer = findContainer(active.id);

        if (!overContainer || !activeContainer) {
          return;
        }

        if (activeContainer !== overContainer) {
          setItems((items) => {
            // setTask({ id: JSON.parse(activeId).id, status: overContainer });
            const activeItems = items[activeContainer];
            const overItems = items[overContainer];
            const overIndex = overItems.indexOf(overId);
            const activeIndex = activeItems.indexOf(active.id);

            let newIndex: number;

            if (overId in items) {
              newIndex = overItems.length + 1;
            } else {
              const isBelowOverItem =
                over &&
                active.rect.current.translated &&
                active.rect.current.translated.offsetTop >
                over.rect.offsetTop + over.rect.height;

              const modifier = isBelowOverItem ? 1 : 0;

              newIndex =
                overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
            }

            recentlyMovedToNewContainer.current = true;

            return {
              ...items,
              [activeContainer]: items[activeContainer].filter(
                (item) => item !== active.id
              ),
              [overContainer]: [
                ...items[overContainer].slice(0, newIndex),
                items[activeContainer][activeIndex],
                ...items[overContainer].slice(
                  newIndex,
                  items[overContainer].length
                )
              ]
            };
          });
        }
      }}
      onDragEnd={({ active, over }) => {
        if (active.id in items && over?.id) {
          setContainers((containers) => {
            const activeIndex = containers.indexOf(active.id);
            const overIndex = containers.indexOf(over.id);

            return arrayMove(containers, activeIndex, overIndex);
          });
        }

        const activeContainer = findContainer(active.id);

        if (!activeContainer) {
          setActiveId(null);
          return;
        }

        const overId = over?.id;

        if (!overId) {
          setActiveId(null);
          return;
        }

        if (overId === TRASH_ID) {
          setItems((items) => ({
            ...items,
            [activeContainer]: items[activeContainer].filter(
              (id) => id !== activeId
            )
          }));
          setActiveId(null);
          return;
        }

        if (overId === PLACEHOLDER_ID) {
          const newContainerId = getNextContainerId();

          unstable_batchedUpdates(() => {
            setContainers((containers) => [...containers, newContainerId]);
            setItems((items) => ({
              ...items,
              [activeContainer]: items[activeContainer].filter(
                (id) => id !== activeId
              ),
              [newContainerId]: [active.id]
            }));
            setActiveId(null);
          });
          return;
        }

        const overContainer = findContainer(overId);

        if (overContainer) {
          const activeIndex = items[activeContainer].indexOf(active.id);
          const overIndex = items[overContainer].indexOf(overId);

          if (activeIndex !== overIndex) {
            setItems((items) => ({
              ...items,
              [overContainer]: arrayMove(
                items[overContainer],
                activeIndex,
                overIndex
              )
            }));
          }
        }
        setActiveId(null);
        setItems(items => {
          saveTasks(items, { id: JSON.parse(activeId).id, status: overContainer });
          return items;
        })
      }}
      cancelDrop={cancelDrop}
      onDragCancel={onDragCancel}
      modifiers={modifiers}
    >
      <div
        style={{
          display: "inline-flex",
          boxSizing: "border-box",
          gridAutoFlow: "column",
          width: '100%'
        }}
      >
        <SortableContext
          items={[...containers, PLACEHOLDER_ID]}
          strategy={verticalListSortingStrategy}
        >
          {containers.map((containerId) => (
            <DroppableContainer
              key={containerId}
              id={containerId}
              label={`${containerId}`}
              columns={columns}
              items={items[containerId]}
              scrollable={true}
              style={containerStyle}
              onRemove={() => handleRemove(containerId)}
            >
              <SortableContext items={items[containerId]} strategy={strategy} >
                {items[containerId].map((value, index) => {
                  return (
                    <SortableItem
                      disabled={isSortingContainer}
                      key={JSON.parse(value).id}
                      id={value}
                      index={index}
                      handle={handle}
                      style={getItemStyles}
                      wrapperStyle={wrapperStyle}
                      renderItem={renderItem}
                      containerId={containerId}
                      getIndex={getIndex}

                    />
                  );
                })}
              </SortableContext>
            </DroppableContainer>
          ))}
        </SortableContext>
      </div>
      {createPortal(
        <DragOverlay adjustScale={adjustScale}>
          {activeId
            ? containers.includes(activeId)
              ? renderContainerDragOverlay(activeId)
              : renderSortableItemDragOverlay(activeId)
            : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );

  function renderSortableItemDragOverlay(id: string) {
    return (
      <Item
        value={JSON.parse(id)}
        handle={handle}
        style={getItemStyles({
          containerId: findContainer(id) as string,
          overIndex: -1,
          index: getIndex(id),
          value: id,
          isSorting: true,
          isDragging: true,
          isDragOverlay: true
        })}
        wrapperStyle={wrapperStyle({ index: 0 })}
        renderItem={renderItem}
        dragOverlay
      />
    );
  }

  function renderContainerDragOverlay(containerId: string) {
    return (
      <Container
        label={`Column ${containerId}`}
        columns={columns}
        style={{
          height: "100%"
        }}
        shadow
        unstyled={false}
      >
        {items[containerId].map((item, index) => (
          <Item
            key={JSON.parse(item).id}
            value={item}
            handle={handle}
            style={getItemStyles({
              containerId,
              overIndex: -1,
              index: getIndex(item),
              value: item,
              isDragging: false,
              isSorting: false,
              isDragOverlay: false
            })}
            wrapperStyle={wrapperStyle({ index })}
            renderItem={renderItem}
          />
        ))}
      </Container>
    );
  }


  function handleRemove(containerID: UniqueIdentifier) {
    setContainers((containers) =>
      containers.filter((id) => id !== containerID)
    );
  }

  function getNextContainerId() {
    const containeIds = Object.keys(items);
    const lastContaineId = containeIds[containeIds.length - 1];

    return String.fromCharCode(lastContaineId.charCodeAt(0) + 1);
  }
}

interface SortableItemProps {
  containerId: string;
  id: string;
  index: number;
  handle: boolean;
  disabled?: boolean;
  style(args: any): React.CSSProperties;
  getIndex(id: string): number;
  renderItem(): React.ReactElement;
  wrapperStyle({ index }: { index: number }): React.CSSProperties;
}

function SortableItem({
  disabled,
  id,
  index,
  handle,
  renderItem,
  style,
  containerId,
  getIndex,
  wrapperStyle
}: SortableItemProps) {
  const {
    setNodeRef,
    listeners,
    isDragging,
    isSorting,
    over,
    overIndex,
    transform,
    transition
  } = useSortable({
    id
  });
  const mounted = useMountStatus();
  const mountedWhileDragging = isDragging && !mounted;

  return (
    <Item
      ref={disabled ? undefined : setNodeRef}
      value={JSON.parse(id)}
      dragging={isDragging}
      sorting={isSorting}
      handle={handle}
      index={index}
      wrapperStyle={wrapperStyle({ index })}
      style={style({
        index,
        value: id,
        isDragging,
        isSorting,
        overIndex: over ? getIndex(over.id) : overIndex,
        containerId
      })}
      transition={transition}
      transform={transform}
      fadeIn={mountedWhileDragging}
      listeners={listeners}
      renderItem={renderItem}
    />
  );
}

function useMountStatus() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsMounted(true), 500);

    return () => clearTimeout(timeout);
  }, []);

  return isMounted;
}
