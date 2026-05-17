import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"
import { z } from "zod"

import heroImage from "@/assets/hero.png"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/useAuthStore"

const signUpSchema = z
  .object({
    displayName: z.string().min(1, "Vui lòng nhập tên hiển thị.").max(100),
    username: z
      .string()
      .min(3, "Tên đăng nhập phải có ít nhất 3 ký tự.")
      .regex(/^[a-zA-Z0-9_]+$/, "Chỉ được dùng chữ cái, số và dấu gạch dưới."),
    email: z.string().email("Vui lòng nhập email hợp lệ."),
    password: z
      .string()
      .min(8, "Mật khẩu phải có ít nhất 8 ký tự.")
      .regex(/[A-Z]/, "Mật khẩu cần có ít nhất 1 chữ in hoa.")
      .regex(/[a-z]/, "Mật khẩu cần có ít nhất 1 chữ thường.")
      .regex(/[0-9]/, "Mật khẩu cần có ít nhất 1 chữ số."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp.",
    path: ["confirmPassword"],
  })

type SignUpFormValues = z.infer<typeof signUpSchema>

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate()
  const signUp = useAuthStore((state) => state.signUp)
  const loading = useAuthStore((state) => state.loading)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
  })

  const onSubmit = async (data: SignUpFormValues) => {
    await signUp({
      displayName: data.displayName,
      username: data.username,
      email: data.email,
      password: data.password,
    })
    navigate("/login", { replace: true })
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden border-white/50 bg-white/90 py-0 backdrop-blur">
        <CardContent className="grid p-0 lg:grid-cols-[1.05fr_0.95fr]">
          <form className="order-2 p-6 md:p-8 lg:order-1" onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-5">
              <div className="space-y-3">
                <div className="inline-flex rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-secondary-foreground">
                  Đăng ký tài khoản
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold tracking-tight">
                    Tạo tài khoản Zalegram
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Điền các thông tin bên dưới để thiết lập tài khoản và bắt đầu
                    trò chuyện cùng mọi người.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Tên hiển thị</Label>
                <Input
                  id="displayName"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  {...register("displayName")}
                  aria-invalid={Boolean(errors.displayName)}
                />
                {errors.displayName ? (
                  <p className="text-sm text-destructive">{errors.displayName.message}</p>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="username">Tên đăng nhập</Label>
                  <Input
                    id="username"
                    placeholder="vd: nguyenvana_123"
                    {...register("username")}
                    aria-invalid={Boolean(errors.username)}
                  />
                  {errors.username ? (
                    <p className="text-sm text-destructive">{errors.username.message}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="nguyenvana@email.com"
                    {...register("email")}
                    aria-invalid={Boolean(errors.email)}
                  />
                  {errors.email ? (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password">Mật khẩu</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Tối thiểu 8 ký tự"
                    {...register("password")}
                    aria-invalid={Boolean(errors.password)}
                  />
                  {errors.password ? (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Nhập lại mật khẩu"
                    {...register("confirmPassword")}
                    aria-invalid={Boolean(errors.confirmPassword)}
                  />
                  {errors.confirmPassword ? (
                    <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                  ) : null}
                </div>
              </div>

              <Button className="h-10 w-full" type="submit" disabled={isSubmitting || loading}>
                {isSubmitting || loading ? "Đang tạo tài khoản..." : "Đăng ký ngay"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Đã có tài khoản?{" "}
                <Link className="font-medium text-primary hover:underline" to="/login">
                  Đăng nhập
                </Link>
              </p>
            </div>
          </form>

          <div className="order-1 relative min-h-[280px] overflow-hidden bg-slate-950 lg:order-2">
            <img
              src={heroImage}
              alt="Security themed artwork"
              className="absolute inset-0 h-full w-full object-cover opacity-45"
            />
            <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(16,185,129,0.82),rgba(15,23,42,0.92))]" />
            <div className="relative flex h-full flex-col justify-end gap-3 p-8 text-white">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-white/75">
                An toàn & Bảo mật
              </p>
              <h2 className="max-w-sm text-3xl font-semibold leading-tight">
                Không gian trò chuyện của riêng bạn.
              </h2>
              <p className="max-w-sm text-sm text-white/75">
                Zalegram cam kết bảo vệ dữ liệu cá nhân của bạn. Trải nghiệm nhắn
                tin tốc độ cao, gửi file mượt mà và hoàn toàn miễn phí trên mọi nền
                tảng.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
