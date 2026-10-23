<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>
  <#if section = "header">
    <#if messageHeader??>
      ${kcSanitize(msg("${messageHeader}"))?no_esc}
    <#else>
      ${message.summary}
    </#if>
  <#elseif section = "form">
    <div id="kc-info-message" class="mq-stack">
      <#if messageHeader?? || requiredActions??>
        <p class="mq-body-text">${message.summary}<#if requiredActions??><#list requiredActions>: <strong><#items as reqActionItem>${kcSanitize(msg("requiredAction.${reqActionItem}"))?no_esc}<#sep>, </#items></strong></#list></#if></p>
      <#else>
        <p class="mq-body-text">${msg("mqInfoNext")}</p>
      </#if>
      <#if !skipLink?? && pageRedirectUri?has_content>
        <a class="pf-v5-c-button pf-m-primary mq-block" href="${pageRedirectUri}">${msg("mqBackToApp")}</a>
      <#elseif !skipLink?? && actionUri?has_content>
        <a class="pf-v5-c-button pf-m-primary mq-block" href="${actionUri}">${msg("proceedWithAction")}</a>
      <#else>
        <a class="pf-v5-c-button pf-m-primary mq-block" href="${layout.appUrl()}">${msg("mqBackToApp")}</a>
      </#if>
    </div>
  </#if>
</@layout.registrationLayout>
