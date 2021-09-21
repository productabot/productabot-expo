import React, { useState, useRef } from 'react';
import { Platform, Pressable } from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import * as Haptics from 'expo-haptics';

let dragRefTimeout: any;
class CustomRenderItem extends React.PureComponent {
    render() {
        const { item, renderItem, onPress, dragRef, updateLik, renderItemStyle } = this.props;
        return (
            <Pressable
                onPress={async () => { await onPress(item); }}
                style={(state) => [{ cursor: 'grab', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, margin: 10, marginBottom: 0, borderRadius: 10, backgroundColor: state.pressed ? '#000000' : item.isActive ? '#333333' : '#161616' }, renderItemStyle]}
                onPressIn={() => { if (Platform.OS === 'web') { updateLik(); dragRef.current.flushQueue(); clearTimeout(dragRefTimeout); } }}
                onPressOut={() => { if (Platform.OS === 'web') { dragRef.current.flushQueue(); clearTimeout(dragRefTimeout); dragRefTimeout = setTimeout(() => { dragRef.current.resetHoverState(); }, 750); } }}
                disabled={item.isActive} delayLongPress={200} onLongPress={item.drag}>
                {renderItem(item)}
            </Pressable>
        );
    }
}

export function CustomDraggableFlatList({ data, onPress, renderItem, ListEmptyComponent, onDragEnd, noBorder = false, ListFooterComponent, refreshControl, renderItemStyle = {}, style = {} }: any) {
    const dragRef = useRef(null);
    const [lik, setLik] = useState(`${0}`);
    const updateLik = () => { setLik(`${lik + 1}`) }
    const internalRenderItem = (item) => <CustomRenderItem item={item} renderItem={renderItem} onPress={onPress} dragRef={dragRef} updateLik={updateLik} renderItemStyle={renderItemStyle} />

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