import React, { useState } from 'react';
import { CSS } from "@dnd-kit/utilities";
import { closestCenter, DndContext, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, useSortable, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { useNavigation } from '@react-navigation/native';
import { API, graphqlOperation } from "@aws-amplify/api";
import { Platform, Alert } from 'react-native';
import { useTheme } from '@react-navigation/native';

export function Sortable({
    activationConstraint,
    collisionDetection = closestCenter,
    getItemStyles = () => ({}),
    handle = false,
    items,
    setItems,
    measuring,
    modifiers,
    renderItem,
    reorderItems = arrayMove,
    strategy = rectSortingStrategy,
    useDragOverlay = false,
    wrapperStyle = () => ({}),
    setContextPosition,
    setLoading,
    onRefresh,
    menuRef,
    archived,
    window
}: any) {
    const [activeId, setActiveId] = useState(null);
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint,
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
            collisionDetection={collisionDetection}
            onDragStart={({ active }) => {
                if (!active) { return; }
                setActiveId(active.id);
            }}
            onDragEnd={({ over }) => {
                setActiveId(null);
                if (over) {
                    const overIndex = items.map(obj => obj.id).indexOf(over.id);
                    if (items.map(obj => obj.id).indexOf(activeId) !== overIndex) {
                        const reorderedItems = reorderItems(items, items.map(obj => obj.id).indexOf(activeId), overIndex);
                        setItems(reorderedItems.map(obj => { return { ...obj, id: obj.id ? obj.id + '1' : null } }));
                        setTimeout(() => { setItems(reorderedItems); }, 0);
                    }
                    else {
                        const originalItems = items;
                        setItems(originalItems.map(obj => { return { ...obj, id: obj.id ? obj.id + '1' : null } }));
                        setTimeout(() => { setItems(originalItems); }, 0);
                    }
                }
            }}
            onDragCancel={() => {
                setActiveId(null);
                alert('cancel back')
                setItems(items.map(obj => { return { ...obj, id: obj.id ? obj.id + '1' : null } }));
                setTimeout(() => {
                    setItems(items.map(obj => { return { ...obj, id: obj.id ? obj.id.slice(0, obj.id.length - 1) : null } }));
                }, 0);
            }}
            measuring={measuring}
            modifiers={modifiers}
        >
            <SortableContext items={items} strategy={strategy}>
                <div style={{ display: 'grid', gridGap: 25, gridTemplateColumns: `repeat(${window.width > 1900 ? '10' : window.width > 1800 ? '9' : window.width > 1650 ? '8' : window.width > 1500 ? '7' : window.width > 1200 ? '6' : window.width > 900 ? '5' : window.width > 750 ? '4' : window.width > 550 ? '3' : window.width > 330 ? '2' : '1'},auto)`, width: '100%' }}>
                    {items.map((value, index) => (
                        <SortableItem
                            key={value.id}
                            id={value.id}
                            item={value}
                            handle={handle}
                            index={index}
                            style={getItemStyles}
                            wrapperStyle={wrapperStyle}
                            renderItem={renderItem}
                            useDragOverlay={useDragOverlay}
                            setContextPosition={setContextPosition}
                            setLoading={setLoading}
                            onRefresh={onRefresh}
                            menuRef={menuRef}
                            archived={archived}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}

export function SortableItem({
    handle,
    id,
    item,
    index,
    onRemove,
    style,
    renderItem,
    useDragOverlay,
    wrapperStyle,
    setContextPosition,
    setLoading,
    onRefresh,
    menuRef,
    archived,
}: any) {
    const {
        attributes,
        isDragging,
        isSorting,
        listeners,
        overIndex,
        setNodeRef,
        transform,
        transition,
    } = useSortable({
        id
    });

    return (
        <Item
            ref={setNodeRef}
            value={item}
            dragging={isDragging}
            sorting={isSorting}
            handle={handle}
            renderItem={renderItem}
            index={index}
            style={style({
                index,
                id,
                isDragging,
                isSorting,
                overIndex,
            })}
            onRemove={onRemove ? () => onRemove(id) : undefined}
            transform={transform}
            transition={!useDragOverlay && isDragging ? 'none' : transition}
            wrapperStyle={wrapperStyle({ index, isDragging, id })}
            listeners={listeners}
            data-index={index}
            data-id={id}
            dragOverlay={!useDragOverlay && isDragging}
            setContextPosition={setContextPosition}
            setLoading={setLoading}
            onRefresh={onRefresh}
            menuRef={menuRef}
            archived={archived}
            {...attributes}
        />
    );
}

const Item = React.memo(
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
                setContextPosition,
                setLoading,
                onRefresh,
                menuRef,
                archived,
                ...props
            },
            ref
        ) => {
            const navigation = useNavigation();
            const { colors } = useTheme();
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
                <div
                    style={
                        {
                            ...wrapperStyle,
                            transition,
                            transform: CSS.Translate.toString(transform),
                            zIndex: dragging ? 1 : 0
                        } as React.CSSProperties
                    }
                    ref={ref}
                >
                    <div
                        style={{ color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', textAlign: 'center', fontSize: 14 }}
                        data-cypress="draggable-item"
                        {...listeners}
                        {...props}
                        tabIndex={!handle ? 0 : undefined}
                    >
                        {value.id ?
                            <a
                                className='projectTile'
                                onContextMenu={(e) => {
                                    e.preventDefault(); setContextPosition({
                                        x: e.pageX, y: e.pageY,
                                        archive: async () => {
                                            const archiveFunction = async () => {
                                                setLoading(true);
                                                await API.graphql(graphqlOperation(`mutation{update_projects_by_pk(pk_columns: {id: "${value.id}"}, _set: {archived: "${value.archived ? 'false' : 'true'}"}) {id}}`));
                                                await onRefresh();
                                                setLoading(false);
                                            }
                                            if (Platform.OS !== 'web') {
                                                Alert.alert('Warning', `Are you sure you want to ${archived ? 'un' : ''}archive this project?`,
                                                    [{ text: "No", style: "cancel" }, { text: "Yes", style: "destructive", onPress: async () => { await archiveFunction(); } }]);
                                            }
                                            else if (confirm(`Are you sure you want to ${archived ? 'un' : ''}archive this project?`)) { await archiveFunction() }
                                        },
                                        rename: async () => {
                                            const renameFunction = async (rename) => {
                                                setLoading(true);
                                                if (rename) {
                                                    await API.graphql(graphqlOperation(`mutation{update_projects_by_pk(pk_columns: {id: "${value.id}"}, _set: {name: "${rename}"}) {id}}`));
                                                }
                                                await onRefresh();
                                                setLoading(false);
                                            }
                                            if (Platform.OS !== 'web') {
                                                Alert.prompt('Rename', '', async (text) => {
                                                    await renameFunction(text);
                                                }, 'plain-text', value.name);
                                            }
                                            else {
                                                let rename = prompt('Rename', value.name);
                                                await renameFunction(rename);
                                            }
                                        }
                                    });
                                    menuRef.current.open();
                                }}
                                href={`/project/${value.id}`}
                                onClick={(e) => { e.preventDefault(); navigation.push('project', { id: value.id }) }}
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', cursor: dragging ? 'grabbing' : 'grab' }}>
                                <div style={{ height: 140, width: 140, border: `1px solid ${colors.text}`, borderRadius: 20 }}>
                                    <img style={{ width: 140, height: 140, borderRadius: 19, objectFit: 'cover' }} src={`https://files.productabot.com/public/${value.image}`} />
                                </div>
                                <div style={{ marginBottom: 3 }}>
                                    <span style={{ color: colors.text }}>{value.public ? '' : '🔒'}{value.name}</span>
                                </div>
                                {value.goal &&
                                    <div style={{ flexDirection: 'row', width: 120, height: 5, backgroundColor: colors.background, borderColor: '#666666', borderWidth: 1, borderStyle: 'solid', borderRadius: 5, alignItems: 'flex-start', alignContent: 'flex-start' }}>
                                        <div style={{ height: '100%', backgroundColor: value.color === '#000000' ? '#ffffff' : value.color, width: `${(Math.min(value.entries_aggregate.aggregate.sum.hours / value.goal, 1) * 100).toFixed(0)}%`, borderRadius: 3 }} />
                                    </div>}
                            </a>
                            :
                            <div
                                className='projectTile'
                                onClick={async () => {
                                    setLoading(true);
                                    let data = await API.graphql(graphqlOperation(`mutation {insert_projects_one(object: {name: "new project", key: "NP", description: "Add a description to your new project", color: "#ff0000", order: 1000}) {id}}`));
                                    setLoading(false);
                                    navigation.push('project', { id: data.data.insert_projects_one.id });
                                }}
                                style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 160, cursor: 'pointer', fontSize: 40 }}><span style={{ color: colors.text }}>+</span></div>}
                    </div>
                </div>
            );
        }
    )
);