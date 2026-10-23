<#import "template.ftl" as layout>
<@layout.registrationLayout; section>
  <#if section = "header">
    ${msg("logoutConfirmTitle")}
  <#elseif section = "form">
    <div id="kc-logout-confirm" class="mq-stack">
      <p class="mq-body-text">${msg("logoutConfirmHeader")}</p>
      <form class="mq-stack" action="${url.logoutConfirmAction}" onsubmit="confirmLogout.disabled = true; return true;" method="POST">
        <input type="hidden" name="session_code" value="${logoutConfirm.code}">
        <input class="pf-v5-c-button pf-m-primary mq-block" name="confirmLogout" id="kc-logout" type="submit" value="${msg("doLogout")}"/>
      </form>
      <#if !logoutConfirm.skipLink && (client.baseUrl)?has_content>
        <a class="pf-v5-c-button pf-m-secondary mq-block" href="${client.baseUrl}">${msg("mqStaySignedIn")}</a>
      </#if>
    </div>
  </#if>
</@layout.registrationLayout>
