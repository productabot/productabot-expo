import React, { useState, useRef } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { restrictToFirstScrollableAncestor } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import VirtualList from 'react-tiny-virtual-list';
import { useTheme } from '@react-navigation/native';

export function CustomDraggableFlatList({ data, onPress, renderItem, ListEmptyComponent, onDragEnd, noBorder = false, ListFooterComponent, refreshControl, renderItemStyle = {}, style = {}, setContextPosition = () => { }, menuRef = () => { }, onRename = null, onDelete = null, onMove = null, draggable = true, delayDragOnWeb = false, activationConstraint = { distance: 5 }, virtualHeight = 800, virtualSize = 80, onEndReached = () => { }, flatListRef = useRef(null) }: any) {
    const { colors } = useTheme();
    const [activeId, setActiveId] = useState(null);
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint
        }),
        useSensor(TouchSensor, {
            activationConstraint,
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(event) => {
                const { active } = event;
                setActiveId(active.id);
            }}
            onDragEnd={(event) => {
                const { active, over } = event;
                if (active.id !== over.id) {
                    const oldIndex = data.map(obj => obj.id).indexOf(active.id);
                    const newIndex = data.map(obj => obj.id).indexOf(over.id);
                    let newData = arrayMove(data, oldIndex, newIndex);
                    onDragEnd({ data: newData });
                }
                setActiveId(null);
            }}
            modifiers={[restrictToFirstScrollableAncestor]}
        >
            <SortableContext
                items={data}
                strategy={verticalListSortingStrategy}
            >
                <VirtualList
                    onContextMenu={(e) => {
                        if (e.nativeEvent.target.classList.length === 0) {
                            e.preventDefault();
                            setContextPosition({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY + 30, fileContextMenu: true });
                            setTimeout(() => { menuRef.current.open() }, 0);
                        }
                    }}
                    style={{ borderColor: colors.card, borderWidth: noBorder ? 0 : 1, borderStyle: 'solid', borderRadius: 10 }}
                    height={virtualHeight}
                    itemCount={data.length}
                    itemSize={virtualSize}
                    stickyIndices={activeId ? [data.map(obj => obj.id).indexOf(activeId)] : undefined}
                    renderItem={({ index, style }) => {
                        const item = data[index];
                        return (
                            <SortableItem index={index} key={item.id} id={item.id} item={item} renderItemStyle={renderItemStyle} draggable={draggable} menuRef={menuRef} onRename={onRename} onDelete={onDelete} setContextPosition={setContextPosition} RenderItem={renderItem} onPress={onPress} virtualStyle={style} virtualSize={virtualSize} />
                        );
                    }}
                />
            </SortableContext>
            <DragOverlay>
                {activeId ? <NonSortableItem key={activeId} item={data.filter(obj => obj.id === activeId)[0]} renderItemStyle={renderItemStyle} RenderItem={renderItem} virtualSize={virtualSize} /> : null}
            </DragOverlay>
        </DndContext>
    );

    function SortableItem({ id, item, renderItemStyle, draggable, menuRef, onRename, onDelete, setContextPosition, RenderItem, onPress, virtualStyle, virtualSize, index }) {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging
        } = useSortable({ id: id });
        const { colors } = useTheme();

        const style = {
            ...renderItemStyle,
            transform: CSS.Transform.toString(transform),
            transition,
            color: colors.text,
            opacity: isDragging ? 0 : 1,
            cursor: draggable ? 'grab' : 'pointer', 
            display: 'flex', 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            backgroundColor: colors.card,
            ...virtualStyle,
            margin: 5,
            width: 'calc(100% - 20px)',
            height: virtualSize - 5,
        };

        return (
            <div
                className='sortableItem'
                {...draggable && attributes} {...draggable && listeners}
                index={index}
                ref={setNodeRef}
                style={style}
                onClick={async () => { await onPress({ item: item }); }}
                onContextMenu={async (e: any) => {
                    e.preventDefault();
                    setContextPosition({
                        x: e.nativeEvent.pageX, y: e.nativeEvent.pageY + 30,
                        ...(onRename && { rename: async () => onRename({ item: item }) }),
                        ...(onDelete && { delete: async () => onDelete({ item: item }) }),
                        ...(onMove && { move: async () => onMove({ item: item }) })
                    });
                    setTimeout(() => { menuRef.current.open() }, 0);
                }}
            >
                <RenderItem item={item} />
            </div>
        );
    }
    function NonSortableItem({ item, renderItemStyle, RenderItem, virtualSize }) {
        const { colors } = useTheme();
        return (
            <div
                style={{
                    ...renderItemStyle,
                    color: colors.text,
                    cursor: draggable ? 'grab' : 'pointer', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, margin: 0, borderRadius: 10, backgroundColor: colors.card,
                    height: virtualSize - 40,
                }}
            >
                <RenderItem item={item} />
            </div>
        );
    }
}