// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {
    ReactElement,
    useEffect,
    useMemo,
    useCallback,
    useRef,
    useState,
} from 'react'
import {getDefaultKeyBinding, EditorState, ContentState, DraftHandleValue} from 'draft-js'
import Editor from '@draft-js-plugins/editor'
import createMentionPlugin, {
    defaultSuggestionsFilter,
    MentionData,
} from '@draft-js-plugins/mention'
import '@draft-js-plugins/mention/lib/plugin.css'
import './markdownEditorInput.scss'

import createEmojiPlugin from '@draft-js-plugins/emoji'
import '@draft-js-plugins/emoji/lib/plugin.css'

import {getWorkspaceUsersList} from '../../store/users'
import {useAppSelector} from '../../store/hooks'
import {IUser} from '../../user'

import Entry from './entryComponent/entryComponent'

const imageURLForUser = (window as any).Components?.imageURLForUser

type Props = {
    onChange?: (text: string) => void
    onFocus?: () => void
    onBlur?: (text: string) => void
    initialText?: string
    id?: string
    isEditing: boolean
}

const MarkdownEditorInput = (props: Props): ReactElement => {
    const {onChange, onFocus, onBlur, initialText, id, isEditing} = props
    const workspaceUsers = useAppSelector<IUser[]>(getWorkspaceUsersList)
    const mentions: MentionData[] = useMemo(() =>
        workspaceUsers.map((user) =>
            ({
                name: user.username,
                avatar: `${imageURLForUser ? imageURLForUser(user.id) : ''}`,
                isBot: user.is_bot,
            }))
    , [workspaceUsers])
    const ref = useRef<Editor>(null)
    const [editorState, setEditorState] = useState(() => {
        const state = EditorState.createWithContent(ContentState.createFromText(initialText || ''))
        return EditorState.moveSelectionToEnd(state)
    })
    const [isMentionPopoverOpen, setIsMentionPopoverOpen] = useState(false)
    const [isEmojiPopoverOpen, setIsEmojiPopoverOpen] = useState(false)
    const [suggestions, setSuggestions] = useState(mentions)

    const {MentionSuggestions, plugins, EmojiSuggestions} = useMemo(() => {
        const mentionPlugin = createMentionPlugin({mentionPrefix: '@'})
        const emojiPlugin = createEmojiPlugin()

        // eslint-disable-next-line no-shadow
        const {EmojiSuggestions} = emojiPlugin
        // eslint-disable-next-line no-shadow
        const {MentionSuggestions} = mentionPlugin
        // eslint-disable-next-line no-shadow
        const plugins = [
            mentionPlugin,
            emojiPlugin,
        ]
        return {plugins, MentionSuggestions, EmojiSuggestions}
    }, [])

    useEffect(() => {
        if (isEditing) {
            if (initialText === '') {
                setEditorState(EditorState.createEmpty())
            } else {
                setEditorState(EditorState.moveSelectionToEnd(editorState))
            }
            setTimeout(() => ref.current?.focus(), 200)
        }
    }, [isEditing])

    const customKeyBindingFn = useCallback((e: React.KeyboardEvent) => {
        if (isMentionPopoverOpen || isEmojiPopoverOpen) {
            return undefined
        }

        if (e.key === 'Escape') {
            return 'editor-blur'
        }

        return getDefaultKeyBinding(e as any)
    }, [isEmojiPopoverOpen, isMentionPopoverOpen])

    const handleKeyCommand = useCallback((command: string): DraftHandleValue => {
        if (command === 'editor-blur') {
            ref.current?.blur()
            return 'handled'
        }

        return 'not-handled'
    }, [])

    const onEditorStateBlur = useCallback(() => {
        const text = editorState.getCurrentContent().getPlainText()
        onBlur && onBlur(text)
    }, [editorState, onBlur])

    const onEditorStateChange = useCallback((newEditorState: EditorState) => {
        const newText = newEditorState.getCurrentContent().getPlainText()
        onChange && onChange(newText)
        setEditorState(newEditorState)
    }, [onChange])

    const onMentionPopoverOpenChange = useCallback((open: boolean) => {
        setIsMentionPopoverOpen(open)
    }, [])

    const onEmojiPopoverOpen = useCallback(() => {
        setIsEmojiPopoverOpen(true)
    }, [])

    const onEmojiPopoverClose = useCallback(() => {
        setIsEmojiPopoverOpen(false)
    }, [])

    const onSearchChange = useCallback(({value}: { value: string }) => {
        setSuggestions(defaultSuggestionsFilter(value, mentions))
    }, [mentions])

    let className = 'MarkdownEditorInput'
    if (!isEditing) {
        className += ' MarkdownEditorInput--IsNotEditing'
    }

    return (
        <div
            className={className}
        >
            <Editor
                editorKey={id}
                editorState={editorState}
                onChange={onEditorStateChange}
                plugins={plugins}
                ref={ref}
                onBlur={onEditorStateBlur}
                onFocus={onFocus}
                keyBindingFn={customKeyBindingFn}
                handleKeyCommand={handleKeyCommand}
            />
            <MentionSuggestions
                open={isMentionPopoverOpen}
                onOpenChange={onMentionPopoverOpenChange}
                suggestions={suggestions}
                onSearchChange={onSearchChange}
                entryComponent={Entry}
            />
            <EmojiSuggestions
                onOpen={onEmojiPopoverOpen}
                onClose={onEmojiPopoverClose}
            />
        </div>
    )
}

export default MarkdownEditorInput
