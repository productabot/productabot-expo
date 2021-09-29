import React, { useState, useRef } from 'react';
import { Platform, Pressable, ActionSheetIOS } from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import * as Haptics from 'expo-haptics';

let dragRefTimeout: any;
let mobileContextTimeout: any;
let pageX: number | null = null;
let pageY: number | null = null;
class CustomRenderItem extends React.PureComponent {
    render() {
        const { item, renderItem, onPress, dragRef, updateLik, renderItemStyle, setContextPosition, menuRef, onRename, onDelete, draggable } = this.props;
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
                    if (Platform.OS === 'web') {
                        updateLik();
                        dragRef.current.flushQueue();
                        clearTimeout(dragRefTimeout);
                    }
                    else {
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
                onPressOut={() => { if (Platform.OS === 'web') { dragRef.current.flushQueue(); clearTimeout(dragRefTimeout); dragRefTimeout = setTimeout(() => { dragRef.current && dragRef.current.resetHoverState(); }, 750); } else { pageX = null; pageY = null; clearTimeout(mobileContextTimeout); } }}
                disabled={item.isActive} delayLongPress={200} onLongPress={draggable ? item.drag : () => { }}>
                {renderItem(item)}
            </Pressable>
        );
    }
}

export function CustomDraggableFlatList({ data, onPress, renderItem, ListEmptyComponent, onDragEnd, noBorder = false, ListFooterComponent, refreshControl, renderItemStyle = {}, style = {}, setContextPosition = () => { }, menuRef = () => { }, onRename = null, onDelete = null, draggable = true }: any) {
    const dragRef = useRef(null);
    const [lik, setLik] = useState(`${0}`);
    const updateLik = () => { setLik(`${lik + 1}`) }
    const internalRenderItem = (item) => <CustomRenderItem item={item} renderItem={renderItem} onPress={onPress} dragRef={dragRef} updateLik={updateLik} renderItemStyle={renderItemStyle} setContextPosition={setContextPosition} menuRef={menuRef} onRename={onRename} onDelete={onDelete} draggable={draggable} />

    return (
        <DraggableFlatList
            ref={dragRef}
            style={[{ height: '100%' }, (Platform.OS === 'web' && !noBorder) && { borderColor: '#333333', borderWidth: 1, borderStyle: 'solid', borderRadius: 10 }, style]}
            data={data}
            contentContainerStyle={{ width: '100%' }}
            layoutInvalidationKey={lik}
            autoscrollSpeed={200}
            renderItem={internalRenderItem}
            keyExtractor={(item, index) => { return `draggable-item-${item.id}` }}
            onEndReached={() => { }}
            ListEmptyComponent={ListEmptyComponent}
            dragItemOverflow={true}
            onDragBegin={() => { Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }}
            onTouchEnd={() => { Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            onDragEnd={onDragEnd}
            ListFooterComponent={ListFooterComponent}
            refreshControl={refreshControl}
            initialNumToRender={11}
        />
    )
}