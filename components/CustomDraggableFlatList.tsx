import React, { useState, useRef } from 'react';
import { Platform, Pressable, ActionSheetIOS, View } from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import * as Haptics from 'expo-haptics';
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

let dragRefTimeout: any;
let mobileContextTimeout: any;
let pageX: number | null = null;
let pageY: number | null = null;
let dragged: boolean = false;
class CustomRenderItem extends React.PureComponent {
    render() {
        const { item, renderItem, onPress, dragRef, updateLik, renderItemStyle, setContextPosition, menuRef, onRename, onDelete, draggable, delayDragOnWeb } = this.props;
        return (
            <Pressable
                onContextMenu={async (e: any) => {
                    e.preventDefault();
                    setContextPosition({
                        x: e.nativeEvent.pageX, y: e.nativeEvent.pageY + 40,
                        ...(onRename && { rename: async () => onRename(item) }),
                        ...(onDelete && { delete: async () => onDelete(item) })
                    });
                    setTimeout(() => { menuRef.current.open() }, 0);
                }}
                onPress={async () => { await onPress(item); }}
                style={(state) => [{ cursor: draggable ? 'grab' : 'pointer', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, margin: 10, marginBottom: 0, borderRadius: 10, backgroundColor: state.pressed ? '#000000' : item.isActive ? '#333333' : state.hovered ? '#202020' : '#161616' }, renderItemStyle]}
                onPressIn={async () => {
                    // if (Platform.OS === 'web') { setTimeout(() => { updateLik(); }, 10); }
                    if (Platform.OS === 'web' && draggable && !delayDragOnWeb) {
                        dragged = false;
                        setTimeout(() => { dragged = true; }, 100);
                        item.drag();
                    }
                    else if (Platform.OS !== 'web') {
                        const mobileContext = async () => {
                            dragRef.current.resetHoverState();
                            let options = ['Cancel'];
                            onRename && options.push('Rename');
                            onDelete && options.push('Delete');
                            ActionSheetIOS.showActionSheetWithOptions(
                                {
                                    options: options,
                                    cancelButtonIndex: 0,
                                    destructiveButtonIndex: options.indexOf('Delete')
                                },
                                async (buttonIndex) => {
                                    if (buttonIndex === options.indexOf('Rename')) {
                                        await onRename(item);
                                    }
                                    else if (buttonIndex === options.indexOf('Delete')) {
                                        await onDelete(item);
                                    }
                                }
                            );
                        }
                        mobileContextTimeout = setTimeout(mobileContext, 1000);
                    }
                }}
                onTouchMove={(e) => {
                    if (!pageX || !pageY) {
                        pageX = e.nativeEvent.pageX; pageY = e.nativeEvent.pageY;
                    }
                    else if (pageX !== e.nativeEvent.pageX || pageY !== e.nativeEvent.pageY) {
                        clearTimeout(mobileContextTimeout);
                        pageX = null;
                        pageY = null;
                    }
                }}
                onPressOut={async () => { if (Platform.OS === 'web') { if (!dragged && !delayDragOnWeb) { await onPress(item); } clearTimeout(dragRefTimeout); dragRefTimeout = setTimeout(() => { dragRef.current && dragRef.current.resetHoverState(); }, 750); } else { pageX = null; pageY = null; clearTimeout(mobileContextTimeout); } }}
                disabled={item.isActive} delayLongPress={150} onLongPress={draggable ? item.drag : () => { }}>
                {renderItem(item)}
            </Pressable>
        );
    }
}



export function CustomDraggableFlatList({ data, onPress, renderItem, ListEmptyComponent, onDragEnd, noBorder = false, ListFooterComponent, refreshControl, renderItemStyle = {}, style = {}, setContextPosition = () => { }, menuRef = () => { }, onRename = null, onDelete = null, draggable = true, delayDragOnWeb = false, activationConstraint = { distance: 5 }, virtualHeight = 800, virtualSize = 80, onEndReached = () => { } }: any) {
    if (Platform.OS === 'ios') {
        const dragRef = useRef(null);
        const [lik, setLik] = useState(`${0}`);
        const updateLik = () => { setLik(`${new Date().toISOString()}`) }
        const internalRenderItem = (item) => <CustomRenderItem item={item} renderItem={renderItem} onPress={onPress} dragRef={dragRef} updateLik={updateLik} renderItemStyle={renderItemStyle} setContextPosition={setContextPosition} menuRef={menuRef} onRename={onRename} onDelete={onDelete} draggable={draggable} delayDragOnWeb={delayDragOnWeb} />

        React.useEffect(() => {
            const wheelListener = (e) => { setTimeout(() => { updateLik(); }, 20); }
            Platform.OS === 'web' && window.addEventListener("wheel", wheelListener);
            return () => { Platform.OS === 'web' && window.removeEventListener('wheel', wheelListener); }
        }, []);

        return (
            <DraggableFlatList
                ref={dragRef}
                style={[{ height: '100%' }, (Platform.OS === 'web' && !noBorder) && { borderColor: '#333333', borderWidth: 1, borderStyle: 'solid', borderRadius: 10 }, style]}
                data={data}
                containerStyle={{ maxHeight: '100%' }}
                contentContainerStyle={{ width: '100%' }}
                layoutInvalidationKey={lik}
                autoscrollSpeed={200}
                renderItem={internalRenderItem}
                keyExtractor={(item, index) => { return `draggable-item-${item ? item.id : new Date().toISOString()}` }}
                onEndReached={() => { onEndReached(); }}
                ListEmptyComponent={ListEmptyComponent}
                dragItemOverflow={true}
                onDragBegin={() => { if (Platform.OS !== 'web') { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } }}
                onDragEnd={(props) => { onDragEnd(props); setTimeout(() => { updateLik(); }, 20); }}
                ListFooterComponent={ListFooterComponent}
                refreshControl={refreshControl}
                initialNumToRender={11}
                activationDistance={5}
                autoscrollThreshold={100}
            />
        )
    }
    else {
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
                    {/* {data.map(item => <SortableItem key={item.id} id={item.id} item={item} renderItemStyle={renderItemStyle} draggable={draggable} menuRef={menuRef} onRename={onRename} onDelete={onDelete} setContextPosition={setContextPosition} RenderItem={renderItem} onPress={onPress} />)} */}
                    <VirtualList
                        style={{ borderColor: '#333333', borderWidth: 1, borderStyle: 'solid', borderRadius: 10 }}
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

            const style = {
                ...renderItemStyle,
                transform: CSS.Transform.toString(transform),
                transition,
                color: '#fff',
                opacity: isDragging ? 0 : 1,
                cursor: draggable ? 'grab' : 'pointer', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, backgroundColor: '#161616',
                ...virtualStyle,
                margin: 10,
                width: 'calc(100% - 50px)',
                height: virtualSize - 40,
                padding: 15
            };

            return (
                <div
                    {...draggable && attributes} {...draggable && listeners}
                    index={index}
                    ref={setNodeRef}
                    style={style}
                    onClick={async () => { await onPress({ item: item }); }}
                    onContextMenu={async (e: any) => {
                        e.preventDefault();
                        setContextPosition({
                            x: e.nativeEvent.pageX, y: e.nativeEvent.pageY + 40,
                            ...(onRename && { rename: async () => onRename(item) }),
                            ...(onDelete && { delete: async () => onDelete(item) })
                        });
                        setTimeout(() => { menuRef.current.open() }, 0);
                    }}
                >
                    <RenderItem item={item} />
                </div>
            );
        }
        function NonSortableItem({ item, renderItemStyle, RenderItem, virtualSize }) {
            return (
                <div
                    style={{
                        ...renderItemStyle,
                        color: '#fff',
                        cursor: draggable ? 'grab' : 'pointer', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, margin: 0, borderRadius: 10, backgroundColor: '#333333',
                        height: virtualSize - 40,
                    }}
                >
                    <RenderItem item={item} />
                </div>
            );
        }
    }
}
