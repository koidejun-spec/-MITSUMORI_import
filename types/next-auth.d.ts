import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      email: string
      name: string
      isAdmin: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    isAdmin: boolean
  }
}
