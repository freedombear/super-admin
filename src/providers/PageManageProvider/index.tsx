import { createContext, ReactNode, RefObject, useContext, useMemo, useRef, useState } from "react"
import { message } from "antd"
import useSessionStorageState from "@/hooks/useSessionStorageState.ts"
import { KeepAliveRef } from "keepalive-for-react"
import { useLocation, useNavigate } from "react-router-dom"

export type PageConfig = {
    label: string // 路由的名称
    // 路由的 path
    key: string
}

export interface PageManage {
    // 当前激活的路由 key 值
    active: string
    // 所有存在的路由 tabs
    pages: PageConfig[]
    close: (key: string, cb?: () => void) => string | null | undefined
    open: (info: PageConfig) => void
    closeCurrent: (cb?: () => void) => string | null | undefined
    getKeepAliveRef: () => RefObject<KeepAliveRef> | undefined
}

const PageContext = createContext<PageManage>({
    active: "",
    pages: [],
    close: (key: string, cb?: () => void) => {
        cb && cb()
        console.log(key)
        return key
    },
    open: (info: PageConfig) => {
        console.log(info)
    },
    closeCurrent: (cb?: () => void) => {
        cb && cb()
        return null
    },
    getKeepAliveRef: () => {
        return undefined
    },
})

export const usePageContext = () => {
    return useContext(PageContext)
}

const TabPageStorageKey = "admin_pages"

export function PageManageProvider(props: { children: ReactNode }) {
    const location = useLocation()
    const [active, setActive] = useState(location.pathname + location.search)
    const keepAliveRef = useRef<KeepAliveRef>(null)
    const [pages, setPages] = useSessionStorageState<PageConfig[]>(TabPageStorageKey, [])
    const [messageApi, messageEle] = message.useMessage()
    const lastOpenKey = useRef<string>("")
    const navigate = useNavigate()
    const getKeepAliveRef = () => {
        return keepAliveRef
    }
    /**
     * 关闭一个标签页
     * @param key 路由的 key
     * @param cb 关闭后成功的回调
     * @returns 返回下一个激活的路由 key
     */
    const close = (key: string, cb?: () => void) => {
        const index = pages.findIndex(item => item.key === key)
        if (index === -1) return
        const newPages = [...pages]
        if (newPages.length <= 1) {
            messageApi.error("至少保留一个标签页")
            return null
        }
        cb && cb()
        keepAliveRef.current?.removeCache(key)
        newPages.splice(index, 1)
        setPages(newPages)
        let nextActiveKey = null
        // if close current page
        if (active === key) {
            const lastKey = lastOpenKey.current
            // if last open key is existed in pages
            if (lastKey && newPages.some(item => item.key === lastKey)) {
                // set last open key to active
                nextActiveKey = lastKey
            } else {
                // if last open key is not existed in pages or last open key is not existed
                // set the last page to active page
                const activeKey = newPages[newPages.length - 1].key
                nextActiveKey = activeKey
            }
            setActive(nextActiveKey)
        }
        // if nextActiveKey is existed, navigate to nextActiveKey
        if (nextActiveKey) {
            navigate({
                pathname: nextActiveKey as string,
            })
        }
        return nextActiveKey
    }

    const open = (info: PageConfig) => {
        if (!info || !info.key) {
            throw new Error(`路由信息不正确 ${JSON.stringify(info)}`)
        }
        // 记住上一个打开的路由
        lastOpenKey.current = active
        const newPages = [...pages]
        // 如果已经存在，就不再添加
        const existed = newPages.some(item => item.key === info.key)
        if (!existed) newPages.push(info)
        setPages(newPages)
        setActive(info.key)
        navigate({
            pathname: info.key,
        })
    }

    /**
     * 关闭当前的标签页
     * @param cb
     * @returns 返回下一个激活的路由 key
     */
    const closeCurrent = (cb?: () => void) => {
        return close(active, cb)
    }

    const value = useMemo(() => {
        return {
            active,
            pages,
            close,
            open,
            closeCurrent,
            getKeepAliveRef,
        }
    }, [active, pages])

    return (
        <PageContext.Provider value={value}>
            {messageEle}
            {props.children}
        </PageContext.Provider>
    )
}
